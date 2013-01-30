Template.page.showGroupList = function () {
  return Session.get("showGroupList");
};

Template.page.showGroupEditor = function () {
  return Session.get("showGroupEditor");
};

///////////////////////////////////////////////////////////////////////////////
// Groups Home

Template.groupActions.events({
  'click .new-group': function () {
    Router.setNewGroup();
    return false;
  }
});

Template.mainHome.events({
  'click .groups li': function (event, template) {
    Router.setGroup(this);
    return false;
  },
});

Template.mainHome.groups = function () {
  return Groups.find({}, {sort: {created: -1}});
};

///////////////////////////////////////////////////////////////////////////////
// Groups Editor

Template.groupEditor.events({
  'click .save': function (event, template) {
    var name = template.find(".name").value;

    if (name.length) {
      Meteor.call('createGroup', {name: name}, function (error, group) {
        if (! error) {
          Session.set("group", group);
        }
      });
      hideGroupEditor();
    } else {
      Session.set("createError",
                  "It needs a name, or why bother?");
    }
  },
  'click .cancel': function () {
    Router.setGroupList();
    return false;
  }
});

var showGroupList = function () {
  Session.set("group", null);
  Session.set("showGroupEditor", false);
  Session.set("showGroupList", true);
};

var showGroupEditor = function () {
  Session.set("showGroupList", false);
  Session.set("showGroupEditor", true);
};

var hideGroupEditor = function() {
  Session.set("showGroupEditor", false);
  Session.set("showGroupList", true);
};