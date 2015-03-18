// DOMContentLoaded is fired once the document has been loaded and parsed,
// but without waiting for other external resources to load (css/images/etc)
// That makes the app more responsive and perceived as faster.
// https://developer.mozilla.org/Web/Reference/Events/DOMContentLoaded
window.addEventListener('DOMContentLoaded', function() {

  // We'll ask the browser to use strict code to help us catch errors earlier.
  // https://developer.mozilla.org/Web/JavaScript/Reference/Functions_and_function_scope/Strict_mode
  'use strict';

  var translate = navigator.mozL10n.get;

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
     window.navigator.mozContacts.clear();
    
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
 
    var request = new XMLHttpRequest({ mozSystem: true });
    var server = new DistantServer();
    //============= request parameters =========================
    var type = "PROPFIND";
    server.url = document.getElementById("url").value;
    var async = true;
    server.login = document.getElementById("login").value;
    server.password = document.getElementById("password").value;
    //==========================================================
    server.name = document.getElementById("name").value;
    var requestText='<?xml version="1.0" encoding="utf-8"?><D:propfind xmlns:D="DAV:"><D:prop><D:getcontenttype/><D:getetag/></D:prop></D:propfind>';
   
    request.open(type, server.url, async, server.login, server.password);
    request.responseType = 'text/xml; charset=utf-8';

    request.addEventListener('error', onRequestError);
    request.onreadystatechange = function() {server.isValidCarddavServer(request);};
    request.send(requestText);

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
            "<div class=\"div_label\"><span>"+server[0]+"</span></div>"+
            "<div class=\"div_icons\"><img src=\"img/icons/headers/update.png\" targetkey=\""+server[0]+"\" class=\"btn_server btn_sync\"/>"+
            "<img src=\"img/icons/headers/delete.png\" targetkey=\""+server[0]+"\" class=\"btn_server btn_delete\" /></div>"+
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
    var dServer = new DistantServer();
    dServer.name = thisServer[0];
    dServer.login = thisServer[1];
    dServer.password = thisServer[2];
    dServer.url = thisServer[3];
      
    // sync process start
    // retrieve server data
    dServer.loadvCardList();
    
  } 
                    
  //end of app
});
