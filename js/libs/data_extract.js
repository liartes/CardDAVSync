function vCardToContactObject(normalizedVCard) {
    var struct = vcardParsingData(normalizedVCard.vcard);
    var person = undefined
    if(struct != false){             
      person = new mozContact(struct);
      if ("init" in person) {
         //Firefox OS 1.2 and below uses a "init" method to initialize the object
          person.init(struct);
      }
   }
   return person;
  }
  
  function vcardParsingData(vcard){
    // init Firefox OS struct
    var name = new Array();
    var givenName = new Array();
    var familyName = new Array();
		var prefix = new Array();
		var suffix = new Array();
    var tel = new Array();
    var mails = new Array();
    var photos = new Array();
    var categories = new Array();
    var additionalName = new Array();
    var nickName = new Array();
		var bday = null;
		var notes = new Array();
		var addresses = new Array();
		var contactUrls = new Array();
		
		// FN -> TODO: what to do if present more than once?
		var vcard_element=vcard.match(vCard.pre['contentline_FN']);
		if(vcard_element!=null && vcard_element.length==1)	// if the FN attribute is not present exactly once, vCard is considered invalid
		{
			// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
			var parsed=vcard_element[0].match(vCard.pre['contentline_parse']);
      name.push(parsed[4]);
		}
		else{
			console.debug("invalid FN attribute");
			return false;	// vcard FN not present or present more than once
		}
    // ------------------------------------------------------------------------------------- //
		// N
   		vcard_element=vcard.match(vCard.pre['contentline_N']);
		if(vcard_element!=null && vcard_element.length==1)	// if the N attribute is not present exactly once, vCard is considered invalid
		{
			// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
			parsed=vcard_element[0].match(vCard.pre['contentline_parse']);
			// parsed_value = [0]->Family, [1]->Given, [2]->Middle, [3]->Prefix, [4]->Suffix
      parsed_value=vcardSplitValue(parsed[4],';');
      familyName.push(parsed_value[0]);
      givenName.push(parsed_value[1]);
			additionalName.push(parsed_value[2]);
			prefix.push(parsed_value[3]);
			suffix.push(parsed_value[4]);
    }
		
		// ------------------------------------------------------------------------------------- //
		// CATEGORIES
		vcard_element=vcard.match(vCard.pre['contentline_CATEGORIES']);
		if(vcard_element!=null){
			for(var ite = 0; ite < vcard_element.length; ite++){
				// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
				parsed=vcard_element[ite].match(vCard.pre['contentline_parse']);
				if(parsed[4] != ""){
					categories.push(parsed[4]);
				}
				// remove the processed parameter
				vcard=vcard.replace(vcard_element[ite],'\r\n');
			}
		}
		// ------------------------------------------------------------------------------------- //
		// NICKNAME -> TODO: what to do if present more than once?
		vcard_element=vcard.match(vCard.pre['contentline_NICKNAME']);
		if(vcard_element!=null)
		{
			for(var ite = 0; ite < vcard_element.length; ite++){
				// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
				parsed=vcard_element[ite].match(vCard.pre['contentline_parse']);
				
				nickName.push(parsed[4]);
				// remove the processed parameter
				vcard=vcard.replace(vcard_element[ite],'\r\n');
			}
		}
		
		// ------------------------------------------------------------------------------------- //
		// TEL
		while((vcard_element=vcard.match(vCard.pre['contentline_TEL']))!=null)
		{
			// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
			parsed=vcard_element[0].match(vCard.pre['contentline_parse']);
			// parsed_value = [1..]->TEL-params
			var parsed_value=vcardSplitParam(parsed[3]);

			// get the "TYPE=" values array
			pref=0;	//by default there is no preferred phone number
			type_values=Array();
			j=0;
			for(i=1;i<parsed_value.length;i++)
			{
				if(parsed_value[i].toLowerCase().indexOf('type=')==0)
				{
					type_values_tmp=parsed_value[i].replace(/^[^=]+=/,'');
					// if one value is a comma separated value of parameters
					type_values_tmp_2=type_values_tmp.split(',');
					for(m=0;m<type_values_tmp_2.length;m++)
						if(type_values_tmp_2[m].match(RegExp('^pref$','i'))==undefined)
							type_values[j++]=vcardUnescapeValue(type_values_tmp_2[m]).toLowerCase();
						else
							pref=1;
				}
			}
			// APPLE SPECIFIC types:
			// find the corresponding group.X-ABLabel: used by APPLE as "TYPE"
			if(parsed[1]!='')
			{
				re=parsed[1].replace('.','\\.X-ABLabel:(.*)')+'\r\n';
				while((vcard_element_related=vcard.match(RegExp('\r\n'+re,'im')))!=null)
				{
					// get the X-ABLabel value
					if(type_values.indexOf(vcard_element_related[1].toLowerCase())==-1)
						type_values[j++]=vcardUnescapeValue(':'+vcard_element_related[1]+':').toLowerCase();
					// remove the processed parameter
					vcard=vcard.replace(vcard_element_related[0],'\r\n');
				}
			}
			type_values_txt=type_values.unique().sort().join(',');	// TYPE=HOME;TYPE=HOME;TYPE=FAX; -> array('FAX','HOME') -> 'fax_home'
			type_values_txt_label=type_values.unique().sort().join(' ').replace(RegExp('^:|:$','g'),'');	// TYPE=HOME;TYPE=HOME;TYPE=FAX; -> array('FAX','HOME') -> 'fax home'
      
			// if no phone type defined, we use the 'cell' type as default
			if(type_values_txt=='')
				type_values_txt=type_values_txt_label='cell';
      
      var isPref = false;
      if(pref == 1){
        isPref = true;
      }
			// remove the processed parameter
			vcard=vcard.replace(vcard_element[0],'\r\n');
      
      var aTel = {
        'carrier': null,
        'pref': isPref,
        'type': type_values,
        'value': parsed[4]
      }
     
      tel.push(aTel);
			
		}
		// ------------------------------------------------------------------------------------- //
		// ADR
		while((vcard_element=vcard.match(vCard.pre['contentline_ADR']))!=null)
		{
			// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
			parsed=vcard_element[0].match(vCard.pre['contentline_parse']);
			// parsed_param = [1..]->ADR-params
			parsed_param=vcardSplitParam(parsed[3]);
			// parsed_value = [1..]->ADR elements
			parsed_value=vcardSplitValue(parsed[4],';');
			
			// get the "TYPE=" values array
			pref=0;	//by default there is no preferred phone number
			type_values=Array();
			j=0;
			for(i=1;i<parsed_value.length;i++)
			{
				if(parsed_value[i].toLowerCase().indexOf('type=')==0)
				{
					type_values_tmp=parsed_value[i].replace(/^[^=]+=/,'');
					// if one value is a comma separated value of parameters
					type_values_tmp_2=type_values_tmp.split(',');
					for(m=0;m<type_values_tmp_2.length;m++)
						if(type_values_tmp_2[m].match(RegExp('^pref$','i'))==undefined)
							type_values[j++]=vcardUnescapeValue(type_values_tmp_2[m]).toLowerCase();
						else
							pref=1;
				}
			}
			// APPLE SPECIFIC data:
			// find the corresponding group.X-ABLabel: used by APPLE as "TYPE"
			if(parsed[1]!='')
			{
				re=parsed[1].replace('.','\\.X-ABLabel:(.*)')+'\r\n';
				while((vcard_element_related=vcard.match(RegExp('\r\n'+re,'im')))!=null)
				{
					// get the X-ABLabel value
					if(type_values.indexOf(vcard_element_related[1].toLowerCase())==-1)
						type_values[j++]=vcardUnescapeValue(':'+vcard_element_related[1]+':').toLowerCase();
					// remove the processed parameter
					vcard=vcard.replace(vcard_element_related[0],'\r\n');
				}
			}
			// find the corresponding group.X-ABADR: used by APPLE as short address country
			var addr_country='';
			if(parsed[1]!='')
			{
				re=parsed[1].replace('.','\\.X-ABADR:(.*)')+'\r\n';
				if((vcard_element_related=vcard.match(RegExp('\r\n'+re,'m')))!=null)
				{
					// get the X-ABADR value
					addr_country=vcardUnescapeValue(vcard_element_related[1]).toLowerCase();
					// remove the processed parameter
					vcard=vcard.replace(vcard_element_related[0],'\r\n');
				}
			}
			
			type_values_txt=type_values.unique().sort().join(',');	// TYPE=HOME;TYPE=HOME;TYPE=FAX; -> array('FAX','HOME') -> 'fax,home'
			type_values_txt_label=type_values.unique().sort().join(' ').replace(RegExp('^:|:$','g'),'');	// TYPE=HOME;TYPE=HOME;TYPE=FAX; -> array('FAX','HOME') -> 'fax home'
			// if no address type defined, we use the 'work' type as default
			if(type_values_txt=='')
				type_values_txt=type_values_txt_label='work';

			// remove the processed parameter
			vcard=vcard.replace(vcard_element[0],'\r\n');
			
      var isPref = false;
      if(pref == 1){
        isPref = true;
      }
			
			var aAdr = {
				'type' : type_values,
				'pref' : isPref,
				'streetAddress' : parsed_value[2],
				'locality' : parsed_value[3],
				'region' : parsed_value[4],
				'postalCode' : parsed_value[5],
				'countryName' : parsed_value[6]
			}
			
			addresses.push(aAdr);
		}
		
		// ------------------------------------------------------------------------------------- //
		// URL
		while((vcard_element=vcard.match(vCard.pre['contentline_URL']))!=null)
		{
			// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
			parsed=vcard_element[0].match(vCard.pre['contentline_parse']);
			// parsed_value = [1..]->URL-params
			parsed_value=vcardSplitParam(parsed[3]);

			// get the "TYPE=" values array
			pref=0;	//by default there is no preferred url address
			type_values=Array();
			j=0;
			for(i=1;i<parsed_value.length;i++)
			{
				if(parsed_value[i].toLowerCase().indexOf('type=')==0)
				{
					type_values_tmp=parsed_value[i].replace(/^[^=]+=/,'');
					// if one value is a comma separated value of parameters
					type_values_tmp_2=type_values_tmp.split(',');
					for(m=0;m<type_values_tmp_2.length;m++)
						if(type_values_tmp_2[m].match(RegExp('^pref$','i'))==undefined)
							type_values[j++]=vcardUnescapeValue(type_values_tmp_2[m]).toLowerCase();
						else
							pref=1;
				}
			}
			// APPLE SPECIFIC types:
			// find the corresponding group.X-ABLabel: used by APPLE as "TYPE"
			if(parsed[1]!='')
			{
				re=parsed[1].replace('.','\\.X-ABLabel:(.*)')+'\r\n';
				while((vcard_element_related=vcard.match(RegExp('\r\n'+re,'im')))!=null)
				{
					// get the X-ABLabel value
					if(type_values.indexOf(vcard_element_related[1].toLowerCase())==-1)
						type_values[j++]=vcardUnescapeValue(':'+vcard_element_related[1]+':').toLowerCase();
					// remove the processed parameter
					vcard=vcard.replace(vcard_element_related[0],'\r\n');
				}
			}

			type_values_txt=type_values.unique().sort().join(',');	// TYPE=WORK;TYPE=WORK;TYPE=HOME; -> array('HOME','WORK') -> 'home,work'
			type_values_txt_label=type_values.unique().sort().join(' ').replace(RegExp('^:|:$','g'),'');	// TYPE=WORK;TYPE=WORK;TYPE=HOME; -> array('HOME','WORK') -> 'home work'
			// if no url type defined, we use the 'homepage' type as default
			if(type_values_txt=='')
				type_values_txt=type_values_txt_label='homepage';

			// remove the processed parameter
			vcard=vcard.replace(vcard_element[0],'\r\n');
     
			var isPref = false;
      if(pref == 1){
        isPref = true;
      }	
			
			var aUrl = {
				'type' : type_values,
				'pref' : isPref,
				'value' : parsed[4]
			};
			contactUrls.push(aUrl);

		}

		// ------------------------------------------------------------------------------------- //
		// BDAY
		vcard_element=vcard.match(vCard.pre['contentline_BDAY']);
		if(vcard_element!=null)	{
			// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
			parsed=vcard_element[0].match(vCard.pre['contentline_parse']);
			var valid = true;
			try {
				var date=new Date(parsed[4]);
				}
			catch (e) {
				valid=false
			}
			if(valid==true){
				bday = date;
				// remove the processed parameter
				vcard=vcard.replace(vcard_element[0],'\r\n');
			}
		}
		
		// ------------------------------------------------------------------------------------- //
		// EMAIL
		while((vcard_element=vcard.match(vCard.pre['contentline_EMAIL']))!=null)
		{
			// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
			parsed=vcard_element[0].match(vCard.pre['contentline_parse']);
			// parsed_value = [1..]->EMAIL-params
			var parsed_value=vcardSplitParam(parsed[3]);

			// get the "TYPE=" values array
			var pref=0;	//by default there is no preferred email address
			var type_values=Array();
			var j=0;
			for(var i=1;i<parsed_value.length;i++)
			{
				if(parsed_value[i].toLowerCase().indexOf('type=')==0)
				{
					var type_values_tmp=parsed_value[i].replace(/^[^=]+=/,'');
					// if one value is a comma separated value of parameters
					var type_values_tmp_2=type_values_tmp.split(',');
					for(var m=0;m<type_values_tmp_2.length;m++)
						if(type_values_tmp_2[m].match(RegExp('^pref$','i'))==undefined)
							type_values[j++]=vcardUnescapeValue(type_values_tmp_2[m]).toLowerCase();
						else
							pref=1;
				}
			}
			// APPLE SPECIFIC types:
			// find the corresponding group.X-ABLabel: used by APPLE as "TYPE"
			if(parsed[1]!='')
			{
				var re=parsed[1].replace('.','\\.X-ABLabel:(.*)')+'\r\n';
        var vcard_element_related;
				while((vcard_element_related=vcard.match(RegExp('\r\n'+re,'im')))!=null)
				{
					// get the X-ABLabel value
					if(type_values.indexOf(vcard_element_related[1].toLowerCase())==-1)
						type_values[j++]=vcardUnescapeValue(':'+vcard_element_related[1]+':').toLowerCase();
					// remove the processed parameter
					vcard=vcard.replace(vcard_element_related[0],'\r\n');
				}
			}

			var type_values_txt=type_values.unique().sort().join(',');	// TYPE=INTERNET;TYPE=INTERNET;TYPE=HOME; -> array('HOME','INTERNET') -> 'home,internet'
			var type_values_txt_label=type_values.unique().sort().join(' ').replace(RegExp('^:|:$','g'),'');	// TYPE=INTERNET;TYPE=INTERNET;TYPE=HOME; -> array('HOME','INTERNET') -> 'home internet'
			// if no email type defined, we use the 'home' type as default
			if(type_values_txt=='')
				type_values_txt=type_values_txt_label='home,internet';

			// get the default available types
			var type_list=new Array();
			// remove the processed parameter
			vcard=vcard.replace(vcard_element[0],'\r\n');
      
      var isPref = false;
      if(pref == 1){
        isPref = true;
      }
      
      var aMail = {
        'type': type_values,
        'pref': isPref,
        'value':parsed[4]
      };
      mails.push(aMail);
      
		} 
		
		// ------------------------------------------------------------------------------------- //
		// NOTE -> TODO: what to do if present more than once?
			vcard_element=vcard.match(vCard.pre['contentline_NOTE']);
			if(vcard_element!=null)
			{
				if(vcard_element.length==1)	// if the NOTE attribute is present exactly once
				{
					// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
					parsed=vcard_element[0].match(vCard.pre['contentline_parse']);
					notes.push(parsed[4]);
					// remove the processed parameter
					vcard=vcard.replace(vcard_element[0],'\r\n');
				}
			}
		
			// ------------------------------------------------------------------------------------- //
		// PHOTO -> TODO: what to do if present more than once?
		vcard_element=vcard.match(vCard.pre['contentline_PHOTO']);
		if(vcard_element!=null)	// if the PHOTO attribute is present more than once, we use the first value
		{
			// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
			parsed=vcard_element[0].match(vCard.pre['contentline_parse']);

			var img_type='';
			// parsed_value = [1..]->PHOTO-params
			parsed_value=vcardSplitParam(parsed[3]);
			for(i=1;i<parsed_value.length;i++)
				if((type_value=parsed_value[i].match(RegExp('TYPE=(.*)','i')))!=undefined)
				{
					img_type=type_value[1].toLowerCase();
					break;
				}

			// support also for unknown type of images (stupid clients)
			var photo = 'data:image'+(img_type!='' ? '/'+img_type : '')+';base64,'+parsed[4];

			var blob = dataURItoBlob(photo);
			photos.push(blob);
			
			// remove the processed parameter
			vcard=vcard.replace(vcard_element[0],'\r\n');
		}
		
    var contactData = {
      'name': name,
      'givenName': givenName,
      'familyName': familyName,
			'additionnalName': additionalName,
			'nickName': nickName,
      'tel': tel,
      'email': mails,
			'honorificPrefix': prefix,
			'honorificSuffix': suffix,
			'photo': photos,
			'bday': bday,
			'category': categories,
			'note': notes,
			'adr' : addresses,
			'url' : contactUrls
   }
    return contactData;
  }

  function compareToExistingContacts(contact){
    
     var filter = {
      filterBy: ['name'],
      filterValue: contact.name[0],
      filterOp: 'equals',
      filterLimit: 1
      };
      var request = window.navigator.mozContacts.find(filter);
      request.onsuccess = function () {
        if(this.result.length == 0){
          navigator.mozContacts.save(contact);
        }
        else{
					console.debug(this.result.length+" concordances dans le repertoire");
					if(localStorage.getItem('manualMerging') == undefined) {
						var manualMerging = confirm("You didn't configure manual merging in settings page. Do you want to manually resolve sync conflicts ?");
    				if(manualMerging) {
							localStorage.setItem('manualMerging', "true");
						}
						else {
							localStorage.setItem('manualMerging', "false");
						}
					}
					console.debug(localStorage.getItem('manualMerging'));
          var contactToSave = mergeContact(this.result[0], contact, localStorage.getItem('manualMerging'));
          navigator.mozContacts.save(contactToSave);
        }
      }

      request.onerror = function () {
        console.log('error occured. Is the contact permission given ?');
      }
  }
  
  function mergeContact(oldC, newC, isManualMerging){
    if(!arraysEquals(oldC.givenName,newC.givenName)){
			if(isManualMerging === "true"){ 
			}
			else {
       oldC.givenName = mergeArrayFields(oldC.givenName, newC.givenName);
			}
    }
    if(!arraysEquals(oldC.familyName,newC.familyName)){
			if(isManualMerging === "true"){ 
			}
			else {
      	oldC.familyName = mergeArrayFields(oldC.familyName, newC.familyName);
			}
    }
    if(!arraysEquals(oldC.email,newC.email)){
			if(isManualMerging === "true"){ 
			}
			else {
      	oldC.email = mergeArrayFields(oldC.email, newC.email);  
			}
    }
    if(!arraysEquals(oldC.tel,newC.tel)){
			if(isManualMerging === "true"){ 
			}
			else {
      	oldC.tel = mergeArrayFields(oldC.tel, newC.tel);
			}
    }
    if(!arraysEquals(oldC.photo,newC.photo)){
			if(isManualMerging === "true"){ 
			}
			else {
      	oldC.photo = mergeArrayFields(oldC.photo, newC.photo);
			}
    }
    if(!arraysEquals(oldC.honorificPrefix,newC.honorificPrefix)){
			if(isManualMerging === "true"){ 
			}
			else {
      	oldC.honorificPrefix = mergeArrayFields(oldC.honorificPrefix, newC.honorificPrefix);
			}
    }
    if(!arraysEquals(oldC.honorificSuffix,newC.honorificSuffix)){
			if(isManualMerging === "true"){ 
			}
			else {
      	oldC.honorificSuffix = mergeArrayFields(oldC.honorificSuffix, newC.honorificSuffix);
			}
    }
    if(!arraysEquals(oldC.additionalName,newC.additionalName)){
			if(isManualMerging === "true"){ 
			}
			else {
      	oldC.additionnalName = mergeArrayFields(oldC.additionalName, newC.additionalName);
			}
    }
    if(!arraysEquals(oldC.nickName,newC.nickName)){
			if(isManualMerging === "true"){ 
			}
			else {
     	 oldC.nickName = mergeArrayFields(oldC.nickName, newC.nickName);
			}
    }
    if(!arraysEquals(oldC.category,newC.category)){
			if(isManualMerging === "true"){ 
			}
			else {
      	oldC.category = mergeArrayFields(oldC.category, newC.category);
			}
    }
    if(!arraysEquals(oldC.note,newC.note)){
			if(isManualMerging === "true"){ 
			}
			else {
     	 oldC.notes = mergeArrayFields(oldC.note, newC.note);
			}
    }
		if(!arraysEquals(oldC.adr,newC.adr)){
			if(isManualMerging === "true"){ 
			}
			else {
				oldC.adr = mergeArrayFields(oldC.adr, newC.adr);
			}
		}
		if(!arraysEquals(oldC.url,newC.url)){
			if(isManualMerging === "true"){ 
			}
			else {
				oldC.url = mergeArrayFields(oldC.url, newC.url);
			}
		}
		// unique value : no merge method
		if(oldC.bday.getTime() != newC.bday.getTime()){
			if(isManualMerging === "true"){ 
			}
			else {
				oldC.bday = newC.bday;
			}
		}
    return oldC;
  }
  
  function mergeArrayFields(a, b){
		if(a == null) {
			a = new Array();
		}
		while (a.pop()) {}
		if(b != null) {
			for(var i = 0; i < b.length; i++) {
				a.push(b[i]);
			}
		}
    return a;
  }

function basicRFCFixesAndCleanup(vcardString){
	// If vCard contains only '\n' instead of '\r\n' we fix it
	if(vcardString.match(RegExp('\r','m'))==null)
		vcardString=vcardString.replace(RegExp('\n','gm'),'\r\n');

	// remove multiple empty lines
	vcardString=vcardString.replace(RegExp('(\r\n)+','gm'),'\r\n');

	// append '\r\n' to the end of the vCard if missing
	if(vcardString[vcardString.length-1]!='\n')
		vcardString+='\r\n';

	// remove line folding
	vcardString=vcardString.replace(RegExp('\r\n'+vCard.re['WSP'],'gm'),'');

	// RFC-obsolete PHOTO fix
	vcardString=vcardString.replace(RegExp('\r\nPHOTO;BASE64:','gim'),'\r\nPHOTO:');

	// ------------------------------------------------------------------------------------- //
	// begin CATEGORIES merge to one CATEGORIES attribute (sorry for related attributes)
	// note: we cannot do this in additionalRFCFixes or normalizeVcard
	var categoriesArr=[];
	var vcard_element=null;
	while((vcard_element=vcardString.match(vCard.pre['contentline_CATEGORIES']))!=null)
	{
		// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
		parsed=vcard_element[0].match(vCard.pre['contentline_parse']);

		categoriesArr[categoriesArr.length]=parsed[4];

		// remove the processed parameter
		vcardString=vcardString.replace(vcard_element[0],'\r\n');

		// find the corresponding group data (if exists)
		if(parsed[1]!='')
		{
			re=parsed[1].replace('.','\\..*')+'\r\n';
			while((vcard_element_related=vcardString.match(RegExp('\r\n'+re,'m')))!=null)
				// remove the processed parameter
				vcardString=vcardString.replace(vcard_element_related[0],'\r\n');
		}
	}
	var categoriesTxt=categoriesArr.join(',');

	var tmp=vcardString.split('\r\n');
	tmp.splice(tmp.length-2,0,'CATEGORIES:'+categoriesTxt);
	// end CATEGORIES cleanup
	// ------------------------------------------------------------------------------------- //

	// ------------------------------------------------------------------------------------- //
	// begin SoGo fixes (company vCards without N and FN attributes)
	//  we must perform vCard fixes here because the N and FN attributes are used in the collection list

	// if N attribute is missing we add it
	if(vcardString.match(vCard.pre['contentline_N'])==null)
		tmp.splice(1,0,'N:;;;;');

	// if FN attribute is missing we add it
	if(vcardString.match(vCard.pre['contentline_FN'])==null)
	{
		var fn_value='';
		// if there is an ORG attribute defined, we use the company name as fn_value (instead of empty string)
		if((tmp2=vcardString.match(vCard.pre['contentline_ORG']))!=null)
		{
			// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
			var parsed=tmp2[0].match(vCard.pre['contentline_parse']);
			// parsed_value = [0]->Org, [1..]->Org Units
			parsed_value=vcardSplitValue(parsed[4],';');
			fn_value=parsed_value[0];
		}
		tmp.splice(1,0,'FN:'+fn_value);
	}
	vcardString=tmp.join('\r\n');
	// end SoGo fixes
	// ------------------------------------------------------------------------------------- //

	return {vcard: vcardString, categories: categoriesTxt};
}

function dataURItoBlob(dataURI) {
    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs
    var byteString = atob(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

    // write the bytes of the string to an ArrayBuffer
    var ab = new ArrayBuffer(byteString.length);
	  var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
		var str = new Array();
	  str.push(ab);
    // write the ArrayBuffer to a blob, and you're done
		var bb = new Blob(str, {'type' : mimeString});
    return bb;
};