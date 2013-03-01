Template.loggedout.events({
  'click .login': function(event, template) {
    var target = $(event.currentTarget);
    var loginCall, params;

    if(target.hasClass("github")) {
      loginCall = Meteor.loginWithGithub;
      params = { requestPermissions: ["user", "public_repo"] };

    } else if(target.hasClass("google")) {
      loginCall = Meteor.loginWithGoogle;
      params = { requestPermissions: ["https://www.googleapis.com/auth/userinfo.profile"] };

    } else if(target.hasClass("twitter")) {
      loginCall = Meteor.loginWithTwitter;
      params = {};
    }

    loginCall(params, function(err){
      if (err) {
        // handle error
      } else {
        // show an alert
      }
    })
  },
  'click .login-form': function(event, template) {
    showTemplate("loginForm");
  }
});

Template.loggedout.hasGitHub = function () {
  return !!Accounts.github;
};

Template.loggedout.hasTwitter = function () {
  return !!Accounts.twitter;
};

Template.loggedout.hasGoogle = function () {
  return !!Accounts.google;
};

Template.loggedin.events({
  'click #logout': function(event, template) {
    Meteor.logout(function(err){
      if (err) {
        // handle error
      } else {
        // Router.setHome();
      }
    });
  },
  'click #user-settings': function(event, template) {
    Router.setUserSettings();
  }
}); 