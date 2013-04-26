///////////////////////////////////////////////////////////////////////////////
// Page

Template.page.appVersion = function () {
  return Session.get("appVersion");
};

Template.page.noGroup = function () {
  var group = Groups.findOne(Session.get("groupId"));
  return group ? false : true;
};

Template.page.showGroup = function () {
  return !!Session.get("groupId");
};

Template.page.groupName = function () {
  if (Session.get("groupId")) {
    group = Groups.findOne(Session.get("groupId"));
    if (group)
      return group.name;
  }
};

Template.page.rendered = function () {
  console.log("page rendered: " + Session.get("groupId"));
  console.log("page rendered 2: " + Session.get("groupSlug"));
};

Template.page.events({
  'click .main-home': function () {
    Router.setHome();
    return false;
  }
});