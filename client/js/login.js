var loginButtonsSession = Accounts._loginButtonsSession;

Handlebars.registerHelper(
  "newLoginButtons",
  function (options) {
    if (options.hash.align === "right")
      return new Handlebars.SafeString(Template._newLoginButtons({align: "right"}));
    else
      return new Handlebars.SafeString(Template._newLoginButtons({align: "left"}));
  }
);

Template._newLoginButtons.events({
  'click #login-name-link, click #login-sign-in-link': function () {
    loginButtonsSession.set('dropdownVisible', true);
    Meteor.flush();
    correctDropdownZIndexes();
  },
  'click .login-close-text': function () {
    loginButtonsSession.closeDropdown();
  }
});

 // shared between dropdown and single mode
Template._newLoginButtons.events({
  'click #login-buttons-logout': function() {
    Meteor.logout(function () {
      loginButtonsSession.closeDropdown();
    });
  }
});

Template._newLoginButtons.preserve({
  'input[id]': Spark._labelFromIdOrName
});

//
// loginButtonLoggedOut template
//

Template._newLoginButtonsLoggedOut.dropdown = function () {
  return Accounts._loginButtons.dropdown();
};

Template._newLoginButtonsLoggedOut.services = function () {
  return Accounts._loginButtons.getLoginServices();
};

Template._newLoginButtonsLoggedOut.singleService = function () {
  var services = Accounts._loginButtons.getLoginServices();
  if (services.length !== 1)
    throw new Error(
      "Shouldn't be rendering this template with more than one configured service");
  return services[0];
};

Template._newLoginButtonsLoggedOut.configurationLoaded = function () {
  return Accounts.loginServicesConfigured();
};


var correctDropdownZIndexes = function () {
  // IE <= 7 has a z-index bug that means we can't just give the
  // dropdown a z-index and expect it to stack above the rest of
  // the page even if nothing else has a z-index.  The nature of
  // the bug is that all positioned elements are considered to
  // have z-index:0 (not auto) and therefore start new stacking
  // contexts, with ties broken by page order.
  //
  // The fix, then is to give z-index:1 to all ancestors
  // of the dropdown having z-index:0.
  for(var n = document.getElementById('login-dropdown-list').parentNode;
      n.nodeName !== 'BODY';
      n = n.parentNode)
    if (n.style.zIndex === 0)
      n.style.zIndex = 1;
};