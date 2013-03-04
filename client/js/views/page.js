///////////////////////////////////////////////////////////////////////////////
// Page

Template.page.appVersion = function () {
  return Session.get("appVersion");
};

Template.page.group = function () {
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

Template.page.rendered = function () {
  // Init plugins
  $(document).foundation("topbar", function (response) {
    console.log(response.errors);
  });
};

Template.page.events({
  'click .home': function () {
    Router.setGroup(getCurrentGroup());
    return false;
  },
  'click .main-home': function () {
    Router.setHome();
    return false;
  }
});

Template.page.loadScripts = function () {
  Meteor.defer(function () {
    // $(document).foundation();
  });
  // return nothing
};