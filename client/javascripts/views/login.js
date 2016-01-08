///////////////////////////////////////////////////////////////////////////////
// Logged Out

Template.loggedout.events({
  "click .reveal-login-modal": function (event, template) {
    var modalId = $(event.target).data("revealId");

    if (modalId)
      $("#" + modalId).foundation("reveal", "open");
  } 
})

///////////////////////////////////////////////////////////////////////////////
// Logged In

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

///////////////////////////////////////////////////////////////////////////////
// Login Panel

Template.loginPanel.rendered = function () {
  $('#login-modal').foundation('reveal');

  // FIXME: not sure why yet but events on the Foundation Reveal Modal
  //        aren't triggering when added using "Template.loginPanel.events".
  //        Manually binding here in the rendered function does work :-(
  $("a.login").bind("click", function(event) {
    event.stopPropagation();
    event.preventDefault();

    var target = $(event.currentTarget),
        parent = target.parent();
    var loginCall, params;

    if(parent.hasClass("github")) {
      loginCall = Meteor.loginWithGithub;
      params = { requestPermissions: ["user:email"] };

    } else if(parent.hasClass("google")) {
      loginCall = Meteor.loginWithGoogle;
      params = { requestPermissions: ["https://www.googleapis.com/auth/plus.login", "https://www.googleapis.com/auth/userinfo.email"] };

    } else if(parent.hasClass("twitter")) {
      loginCall = Meteor.loginWithTwitter;
      params = {};

    } else if(parent.hasClass("facebook")) {
      loginCall = Meteor.loginWithFacebook;
      params = {};
    }

    loginCall(params, function(err){
      if (err) {
        // handle login error
      } else {
        // Close the login modal if loginCall was set
        $("#login-modal a.close-reveal-modal").trigger("click")
      }
    })
  });
};

Template.loginPanel.helpers({
  hasGitHub: function () {
    return !!Meteor.settings && !!Meteor.settings.public.authServices.github;
  },

  hasTwitter: function () {
    return !!Meteor.settings && !!Meteor.settings.public.authServices.twitter;
  },

  hasGoogle: function () {
    return !!Meteor.settings && !!Meteor.settings.public.authServices.google;
  },

  hasFacebook: function () {
    return !!Meteor.settings && !!Meteor.settings.public.authServices.facebook;
  }  
});
