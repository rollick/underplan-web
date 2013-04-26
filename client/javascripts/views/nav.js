// Template.mainNav.rendered = function () {
//   // Init plugins
//   $(document).foundation("topbar", function (response) {
//     console.log(response.errors);
//   });
// };

Template.mainNav.appVersion = function () {
  return Session.get("appVersion");
};

Template.mainNav.group = function () {
  return Groups.findOne(Session.get("groupId"));
};

Template.mainNav.events({
  'click .home': function () {
    Router.setGroup(getCurrentGroup());
    return false;
  }
});

///////////////////////////////////////////////////////////////////////////////
// Activity actions

Template.activityActions.events({
  "click .follow-group a": function (event, template) {
    var followed = $(template.find("a")).hasClass("followed");

    followCurrentGroup(!followed);
    return false;
  }
});

Template.activityActions.isNewRoute = function () {
  var fragment = Backbone.history.fragment;
  if(!fragment)
    return false;

  return !!(fragment.match(/\/new/));
};

Template.activityActions.userCanFollow = function () {
  // can follow if logged in but not a group member
  return !!Meteor.user() && !currentUserBelongsToCurrentGroup()
};

Template.activityActions.followingGroup = function () {
  return isFollowingGroup(Meteor.userId(), Session.get("groupId"));
};

Template.activityActions.userBelongsToGroup = function () {
  return currentUserBelongsToCurrentGroup();
};
