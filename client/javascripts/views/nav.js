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
  var group = getCurrentGroup();
  if (group) {
    return group;
  } else if (Session.get("groupSlug")) {
    group = Groups.findOne({slug: Session.get("groupSlug")});
    if (!group) { // group hasn't loaded!
      return false;
    } else {
      Session.set("groupId", group._id);
      return Session.get("groupId");      
    }
  } else {
    return false;
  }
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
  "click .new-story": function () {
    Router.setNewActivity(getCurrentGroup());
    return false;
  },
  "click .watch-group a": function (event, template) {
    var watched = $(template.find("a")).hasClass("watched");
    watchCurrentGroup(!watched);
    return false;
  }
});

Template.activityActions.isNewRoute = function () {
  var fragment = Backbone.history.fragment;
  if(!fragment)
    return false;

  return !!(fragment.match(/\/new/));
};

Template.activityActions.watchingGroup = function () {
  return isWatchingGroup(Meteor.userId(), getCurrentGroupId());
};

Template.activityActions.userBelongsToGroup = function () {
  return currentUserBelongsToCurrentGroup();
};
