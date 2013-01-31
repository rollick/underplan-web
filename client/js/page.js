///////////////////////////////////////////////////////////////////////////////
// Page

Template.page.group = function () {
  var group = getCurrentGroup();
  if (group) {
    return group;
  } else if (Session.get("groupSlug")) {
    group = Groups.findOne({slug: Session.get("groupSlug")});
    if (!group) { // group hasn't loaded!
      return null;
    } else {
      Session.set("groupId", group._id);
      return Session.get("groupId");      
    }
  } else {
    return null;
  }
};

Template.page.showGroup = function () {
  return !!Session.get("groupSlug");
};

Template.page.groupName = function () {
  if (Session.get("groupId")) {
    return getCurrentGroup().name;
  } else {
    return null
  }
};

Template.page.events({
  'click .home': function () {
    Router.setGroup(getCurrentGroup());
    return false;
  },
  'click .main-home': function () {
    Router.setGroupList();
    return false;
  }
});