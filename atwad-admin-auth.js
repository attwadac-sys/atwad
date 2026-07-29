(function(){
  'use strict';
  var ADMIN_UID = 'NU8g25megKefUOBQGvfkVtBOw802';
  var config = {
    apiKey: "AIzaSyAjq2PVCkAVYwqpIpKIGx01LkbCB3TmW6w",
    authDomain: "atwad-booking.firebaseapp.com",
    databaseURL: "https://atwad-booking-default-rtdb.firebaseio.com",
    projectId: "atwad-booking",
    storageBucket: "atwad-booking.firebasestorage.app",
    messagingSenderId: "110922546416",
    appId: "1:110922546416:web:d8cd48aa90f2d6ce9cd635"
  };

  function currentPage() {
    return location.pathname.split('/').pop() || 'index.html';
  }
  function loginUrl(reason) {
    var url = 'atwad-login.html?return=' + encodeURIComponent(currentPage());
    return reason ? url + '&reason=' + encodeURIComponent(reason) : url;
  }
  function reveal() {
    document.documentElement.style.visibility = '';
    document.documentElement.removeAttribute('data-auth-checking');
  }

  document.documentElement.setAttribute('data-auth-checking', 'true');
  document.documentElement.style.visibility = 'hidden';

  if(typeof firebase === 'undefined' || typeof firebase.auth !== 'function') {
    location.replace(loginUrl('auth-unavailable'));
    return;
  }

  if(!firebase.apps.length) firebase.initializeApp(config);
  var auth = firebase.auth();

  window.atwadAdminAuth = {
    uid: ADMIN_UID,
    auth: auth,
    logout: function(){
      return auth.signOut().finally(function(){
        location.replace(loginUrl('signed-out'));
      });
    }
  };

  auth.onAuthStateChanged(function(user){
    if(!user) {
      location.replace(loginUrl('login-required'));
      return;
    }
    if(user.uid !== ADMIN_UID) {
      auth.signOut().finally(function(){
        location.replace(loginUrl('unauthorized'));
      });
      return;
    }
    reveal();
    window.dispatchEvent(new CustomEvent('atwad-admin-auth-ready', {detail:{uid:user.uid}}));
  }, function(){
    location.replace(loginUrl('auth-error'));
  });
})();
