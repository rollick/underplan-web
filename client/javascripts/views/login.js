Template.loggedout.events({
  'click .login': function(event, template) {
    event.stopPropagation();
    event.preventDefault();

    var target = $(event.currentTarget);
    var loginCall, params;

    if(target.hasClass("github")) {
      loginCall = Meteor.loginWithGithub;
      params = { requestPermissions: ["user:email"] };

    } else if(target.hasClass("google")) {
      loginCall = Meteor.loginWithGoogle;
      params = { requestPermissions: ["https://www.googleapis.com/auth/plus.login", "https://www.googleapis.com/auth/userinfo.email"] };

    } else if(target.hasClass("twitter")) {
      loginCall = Meteor.loginWithTwitter;
      params = {};

    } else if(target.hasClass("facebook")) {
      loginCall = Meteor.loginWithFacebook;
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
    event.stopPropagation();
    event.preventDefault();

    showTemplate("loginForm");
  }
});

Template.loggedout.hasGitHub = function () {
  return !!Meteor.settings && !!Meteor.settings.public.authServices.github;
};

Template.loggedout.hasTwitter = function () {
  return !!Meteor.settings && !!Meteor.settings.public.authServices.twitter;
};

Template.loggedout.hasGoogle = function () {
  return !!Meteor.settings && !!Meteor.settings.public.authServices.google;
};

Template.loggedout.hasFacebook = function () {
  return !!Meteor.settings && !!Meteor.settings.public.authServices.facebook;
};

Template.loggedin.events({
  'click .logout': function(event, template) {
    event.stopPropagation();
    event.preventDefault();

    Meteor.logout(function(err){
      if (err) {
        logIfDev("Logout error: " + err);
      } else {
        Router.setHome();
      }
    });
  },
  'click .settings > a': function() {
    // return false;
  },
  'click .user-settings': function(event, template) {
    event.stopPropagation();
    event.preventDefault();

    Router.setMainSettings();
  },
  'click .main-settings': function(event, template) {
    event.stopPropagation();
    event.preventDefault();

    Router.setMainSettings(Groups.findOne(ReactiveGroupFilter.get("group")));
  }
});

Template.loggedin.helpers({
  settingsActiveCls: function () {
    var fragment = Backbone.history.fragment;
    if(!fragment)
      return false;

    return !!(fragment.match(/settings/)) ? "active" : "";
  },
  mainCls: function () {
    return !!ReactiveGroupFilter.get("group") ? "main-settings" : "user-settings";
  }
});