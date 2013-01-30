///////////////////////////////////////////////////////////////////////////////
// Page

Template.page.group = function () {
  if (Session.get("group")) {
    return Session.get("group");
  } else if (Session.get("groupSlug")) {
    Session.set("group", Groups.findOne({slug: Session.get("groupSlug")}));
    return Session.get("group");
  } else {
    return null;
  }
};

Template.page.showGroup = function () {
  return !!Session.get("groupSlug");
};

Template.page.groupName = function () {
  if (Session.get("group")) {
    return Session.get("group").name;
  } else {
    return null
  }
};

Template.page.events({
  'click .home': function () {
    Router.setGroup(Session.get("group"));
    return false;
  },
  'click .main-home': function () {
    Router.setGroupList();
    return false;
  }
});