// DOMContentLoaded is fired once the document has been loaded and parsed,
// but without waiting for other external resources to load (css/images/etc)
// That makes the app more responsive and perceived as faster.
// https://developer.mozilla.org/Web/Reference/Events/DOMContentLoaded
window.addEventListener('DOMContentLoaded', function() {

  // We'll ask the browser to use strict code to help us catch errors earlier.
  // https://developer.mozilla.org/Web/JavaScript/Reference/Functions_and_function_scope/Strict_mode
  'use strict';

  var translate = navigator.mozL10n.get;
  var request;
  var currentUrl;
  var currentLogin;
  var currentPassword;
  var currentKey;
  var stuffToDo;
  var contactNumber;
  var divLog;

  // We want to wait until the localisations library has loaded all the strings.
  // So we'll tell it to let us know once it's ready.
  navigator.mozL10n.once(start);

  // ---

  function start() {
    
    var btn_register = document.getElementById("btn_register");
    if(btn_register != null){
      btn_register.value = translate('btn_register');
      btn_register.addEventListener('click', registerConnexion);
    }
    else{
      loadServersList();
    }
    //DEV ONLY
    // wipe contacts
    // window.navigator.mozContacts.clear();
    
    // ask for contact access from start
      var filter = {
      filterBy: ['name'],
      filterValue: 'accessPls',
      filterOp: 'equals',
      filterLimit: 1
      };
      var request = window.navigator.mozContacts.find(filter);
    
  }
  
  function registerConnexion() { 
 
    request = new XMLHttpRequest({ mozSystem: true });

    //============= request parameters =========================
    var type = "PROPFIND";
    var url = document.getElementById("url").value;
    var async = true;
    var login = document.getElementById("login").value;
    var password = document.getElementById("password").value;
    //==========================================================
    var requestText='<?xml version="1.0" encoding="utf-8"?><D:propfind xmlns:D="DAV:"><D:prop><D:getcontenttype/><D:getetag/></D:prop></D:propfind>';
   
    request.open(type, url, async, login, password);
    request.responseType = 'text/xml; charset=utf-8';

    // We're setting some handlers here for dealing with both error and
    // data received. We could just declare the functions here, but they are in
    // separate functions so that search() is shorter, and more readable.
    request.addEventListener('error', onRequestError);
    request.onreadystatechange = isValidCardDavServer;
    request.send(requestText);

  }

  function isValidCardDavServer () {
    var state = request.readyState;
    var loader = document.getElementById("loader");
   
    if(state < 4) {
      loader.innerHTML = translate('loader_occuring')
    }
    else {
      // verify data
      var response = request.responseXML;
      if(response === null){
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
                     console.info(propObjList[k].tagName);
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
            saveServerData();
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
  
  function onRequestError() {
    var loader = document.getElementById("loader");
    loader.innerHTML = translate('loader_error');
    console.error("http status code : "+request.statusText);
    
  }
  
  function saveServerData() {
    if(localStorage.getItem('servers') == undefined){
      var servers = new Array();
      var server = new Array();
      server[0] = document.getElementById("name").value;
      server[1] = document.getElementById("login").value;
      server[2] = document.getElementById("password").value;
      server[3] = document.getElementById("url").value;
      
      servers[servers.length] = server;
      
      localStorage.setItem('servers', JSON.stringify(servers));
    }
    else{
      var servers = JSON.parse(localStorage.getItem('servers'));
      servers = [].concat(servers);
      var server = new Array();
      server[0] = document.getElementById("name").value;
      server[1] = document.getElementById("login").value;
      server[2] = document.getElementById("password").value;
      server[3] = document.getElementById("url").value;
      
      servers.push(server);
      localStorage.setItem('servers', JSON.stringify(servers));
    }
    
    // reloadServersList();
  }
  
  function reloadServersList() {
    document.getElementById("div_servers").innerHTML = "";
    loadServersList();
  }
  
  function loadServersList() {
    var servers = JSON.parse(localStorage.getItem('servers'));
    if(servers != undefined){       
      if(servers.length > 0){
        for (var i = 0; i < servers.length; i++){
          var server = servers[i];
          document.getElementById("div_servers").innerHTML += "<div class=\"div_server\">"+
            "<span>"+server[0]+"</span>"+
            "<input type=\"button\" class=\"btn_server btn_sync\" targetkey=\""+server[0]+"\" value=\""+translate('btn_sync')+"\" />"+
            "<input type=\"button\" class=\"btn_server btn_delete\" targetkey=\""+server[0]+"\" value=\""+translate('btn_delete')+"\" />"+
            "<div id=\"log_"+server[0]+"\" class=\"div_log\"></div>"+
            "</div>"
        }
        var deletes = document.getElementsByClassName("btn_delete");
        for(var i = 0; i < deletes.length; i++){
          deletes[i].addEventListener('click', deleteThisKey, false);
        }
        var sync = document.getElementsByClassName("btn_sync");
        for(var i = 0; i < sync.length; i++){
          sync[i].addEventListener('click', syncThisKey, false);
        }
      }
      else{
       document.getElementById("div_servers").innerHTML = translate("div_servers_empty"); 
      }
    }
    else{
      document.getElementById("div_servers").innerHTML = translate("div_servers_empty");
    }
  }
  
  // delete a registered server from localStorage
  function deleteThisKey(e) {
    var really = confirm("Are you sure you want to delete '"+e.target.getAttribute("targetkey")+"' entry ? Your phone contacts will not be affected");
    if(really){
      var servers = JSON.parse(localStorage.getItem('servers'));      
      var newServers = new Array();
      for (var i = 0; i < servers.length; i++){
        var server = servers[i];
        if(server[0] != e.target.getAttribute("targetkey")){
          newServers.push(server);
        }
      }

      localStorage.setItem('servers', JSON.stringify(newServers));

      reloadServersList();
    }
  }
  
  // sync a server with phone
  function syncThisKey(e){
    var servers = JSON.parse(localStorage.getItem('servers')); 
    var thisServer = null;
    for (var i = 0; i < servers.length; i++){
      var server = servers[i];
      if(server[0] == e.target.getAttribute("targetkey")){
        thisServer = server;
      }
    }
    
    // here we get the right server, now sync
    request = new XMLHttpRequest({ mozSystem: true });

    //============= request parameters =========================
    var type = "PROPFIND";
    var url = thisServer[3];
    var async = true;
    var login = thisServer[1];
    var password = thisServer[2];
    //==========================================================
    var requestText='<?xml version="1.0" encoding="utf-8"?><D:propfind xmlns:D="DAV:"><D:prop><D:getcontenttype/><D:getetag/></D:prop></D:propfind>';
   
    request.open(type, url, async, login, password);
    currentUrl = url;
    currentLogin = login;
    currentPassword = password;
    currentKey = thisServer[0];
    request.responseType = 'text/xml; charset=utf-8';

    // We're setting some handlers here for dealing with both error and
    // data received. We could just declare the functions here, but they are in
    // separate functions so that search() is shorter, and more readable.
    request.addEventListener('error', onRequestError);
    request.onreadystatechange = syncServerWithPhone;
    request.send(requestText);
  } 
  
  function syncServerWithPhone () {
    var state = request.readyState;
    if(state < 4) {
    }
    else {
      // get addressbook
      var response = request.responseXML
      if(response.firstChild.tagName == "d:multistatus" || response.firstChild.tagName == "D:multistatus"){
        stuffToDo = new Array();
        // load each contact
        var responseList = response.firstChild.childNodes;
        divLog = document.getElementById("log_"+currentKey);
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
            stuffToDo.push(hreftab[hreftab.length-1])
          }        
        }
        contactNumber = stuffToDo.length;
        syncAddressbookWithPhone();
      }
      }
    }
 //console.debug("response : "+request.responseText);
  
  function syncAddressbookWithPhone(){
    var contactRequest = new XMLHttpRequest({ mozSystem: true });
    //============= request parameters =========================
     var type = "GET";
     var url = currentUrl+ "/" +stuffToDo.pop();
     var async = true;
     var login = currentLogin;
     var password = currentPassword;
     //==========================================================
     contactRequest.open(type, url, async, login, password);
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
            var percentage = ((contactNumber - stuffToDo.length)/contactNumber) * 100;
            var logMessage = "sync : "+parseInt(percentage)+"%";
            if(percentage == 100){  
             logMessage = "sync successful";
            }
            divLog.innerHTML = logMessage;    
           if(stuffToDo.length > 0){
             syncAddressbookWithPhone();
           }
         }
       }
     }
  }                       
  //end of app
});
