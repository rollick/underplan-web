///////////////////////////////////////////////////////////////////////////////
// Page

Template.page.noGroup = function () {
  var group = getCurrentGroup();
  return group ? false : true;
};

Template.page.showGroup = function () {
  return !!Session.get("groupSlug");
};

Template.page.groupName = function () {
  if (Session.get("groupId")) {
    group = getCurrentGroup();
    if (group)
      return group.name;
  }
};

Template.page.events({
  'click .main-home': function () {
    Router.setHome();
    return false;
  }
});

Template.page.loadScripts = function () {
  Meteor.defer(function () {

  });
  // return nothing
};