window.addEventListener('DOMContentLoaded', function() {
  
  if(localStorage.getItem('manualMerging') === "true") {
    document.getElementById("merge_contact_chk").checked = true;
  }
  
  document.getElementById("merge_contact_chk").addEventListener('click', function() {
    if(document.getElementById("merge_contact_chk").checked){
      localStorage.setItem("manualMerging" ,"true");
      console.debug("true");
    }
    else {
      localStorage.setItem("manualMerging" ,"false");
      console.debug("false");
    }
  });
  
});