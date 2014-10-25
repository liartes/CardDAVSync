// distant server object
function DistantServer () {
  // attributes
  this.name = "";
  this.url = "";
  this.login = "";
  this.password = "";
  this.vCardList = new Array();
  this.stuffToDo = new Array();
  this.contactNumber = 0;
  this.isListLoaded = false;
  var translate = navigator.mozL10n.get;
  
  // functions
  this.isValidCarddavServer = function (request){
      var state = request.readyState;
      var loader = document.getElementById("loader");

      if(state < 4) {
        loader.innerHTML = translate('loader_occuring')
      }
      else {
        // verify data
        var response = request.responseXML;
        if(response === null || response == undefined){
            loader.innerHTML = translate('loader_error_cert');  
        }
        else{
          if(response.firstChild.tagName == "d:multistatus" || response.firstChild.tagName == "D:multistatus"){
            // memorize server info
            var responseObjList = response.firstChild.childNodes;
            var type = "";
            // look for vcard type
            var isAddressbook = false;
            for(var j = 0; j < responseObjList.length; j++){
              if(isAddressbook == true){
               break;
              }
              var detailedObjList = responseObjList[j].childNodes;
              for(var l = 0; l < detailedObjList.length; l++){
                if(isAddressbook == true){
                 break;
                }
                if(detailedObjList[l].tagName == "d:propstat" || detailedObjList[l].tagName == "D:propstat"){
                  // recuperer un objet d:prop
                  for(var m = 0; m < detailedObjList[l].childNodes.length; m++){
                    if(detailedObjList[l].childNodes[m].tagName == "d:prop" || detailedObjList[l].childNodes[m].tagName == "D:prop"){
                       var prop = detailedObjList[l].childNodes[m];
                       var propObjList = prop.childNodes;
                       for(var k = 0; k < propObjList.length; k++){
                          if(propObjList[k].tagName == "d:getcontenttype" || propObjList[k].tagName == "D:getcontenttype"){
                            type = propObjList[k].textContent;
                            if(type.indexOf("text/x-vcard") != -1){
                              isAddressbook = true;
                              break;
                            }
                         }
                       }
                    }
                  }
                }   
              }  
            }
            if(isAddressbook == true){
              this.saveServerData();
              loader.innerHTML = translate('loader_success');  
            }
            else{
              loader.innerHTML = translate('loader_not_addressbook');  
            }
          }
          else{
            loader.innerHTML = translate('loader_error'); 
          }
        }
      }
  };
  
  this.loadvCardList = function (){
    var request = new XMLHttpRequest({ mozSystem: true });
    
    //============= request parameters =========================
    var type = "PROPFIND";
    var async = true;
    //==========================================================
    var requestText='<?xml version="1.0" encoding="utf-8"?><D:propfind xmlns:D="DAV:"><D:prop><D:getcontenttype/><D:getetag/></D:prop></D:propfind>';
    var mySelf = this;
    request.open(type, this.url, async, this.login, this.password);
    request.responseType = 'text/xml; charset=utf-8';
    request.addEventListener('error', onRequestError);
    request.onreadystatechange = function() { mySelf.loadAddressbook(request); };
    request.send(requestText);
  };
  
  this.loadAddressbook = function (request) {
      var state = request.readyState;
      if(state < 4) {
      }
      else {
        // get addressbook
        var response = request.responseXML
        if(response.firstChild.tagName == "d:multistatus" || response.firstChild.tagName == "D:multistatus"){
          // load each contact
          var responseList = response.firstChild.childNodes;
          divLog = document.getElementById("log_"+this.name);
          divLog.innerHTML = translate("communication_ok");
          for(var i = 0; i < responseList.length; i++){

            var responseObjList = responseList[i].childNodes;
            var href = "";
            for(var j = 0; j < responseObjList.length; j++){
              if(responseObjList[j].tagName == "d:href" || responseObjList[j].tagName == "D:href"){
                href = responseObjList[j].textContent;
              }
            }
            if(href.contains(".vcf")){
              var hreftab = href.split("/");
              this.stuffToDo.push(hreftab[hreftab.length-1])
            }        
          }
          this.contactNumber = this.stuffToDo.length;
          this.retrieveVcardToStorage();
        }
      }
    };
  
  this.retrieveVcardToStorage = function (){
    var contactRequest = new XMLHttpRequest({ mozSystem: true });
    var mySelf = this;
    //============= request parameters =========================
     var type = "GET";
     var url = this.url+ "/" +this.stuffToDo.pop();
     var async = true;
     //==========================================================
     contactRequest.open(type, url, async, this.login, this.password);
     contactRequest.send();
     contactRequest.onreadystatechange = function(){
       if(contactRequest.readyState < 4){
       }
       else{
          if(contactRequest.responseText != undefined){
            var normalizedVCard = basicRFCFixesAndCleanup(contactRequest.responseText);
            // transfert to firefox OS contact structure
            var contact = vCardToContactObject(normalizedVCard);
            // try to merge with existing contact
            compareToExistingContacts(contact);
            var percentage = ((mySelf.contactNumber - mySelf.stuffToDo.length)/mySelf.contactNumber) * 100;
            var logMessage = "sync : "+parseInt(percentage)+"%";
            if(percentage == 100){  
             logMessage = "sync successful";
            }
            divLog.innerHTML = logMessage;    
           if(mySelf.stuffToDo.length > 0){
             mySelf.retrieveVcardToStorage();
           }
         }
       }
     }
  }
  
  this.getvCardByUID = function (vCardUID){
    
  }
  
  this.saveServerData = function (){
    if(localStorage.getItem('servers') == undefined){
      var servers = new Array();
      var server = new Array();
      server[0] = this.name;
      server[1] = this.login;
      server[2] = this.password;
      server[3] = this.url;
      
      servers[servers.length] = server;  
      localStorage.setItem('servers', JSON.stringify(servers));
    }
    else{
      var servers = JSON.parse(localStorage.getItem('servers'));
      servers = [].concat(servers);
      var server = new Array();
      server[0] = this.name;
      server[1] = this.login;
      server[2] = this.password;
      server[3] = this.url;
      
      servers.push(server);
      localStorage.setItem('servers', JSON.stringify(servers));
    }
  }
}

  
  function onRequestError() {
    var loader = document.getElementById("loader");
    loader.innerHTML = translate('loader_error');
    console.error("http status code : "+request.statusText);
    
  }