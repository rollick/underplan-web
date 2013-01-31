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
          Session.set("groupId", group._id);
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
  Session.set("groupId", null);
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

///////////////////////////////////////////////////////////////////////////////
// Group Admin Menu

Template.groupAdminActions.events({
  'click .membership': function (event, template) {
    Router.setGroupMembership(getCurrentGroup());
  }
});

Template.groupAdminActions.isGroupAdmin = function () {
  var group = getCurrentGroup();
  return !!group && group.owner === Meteor.userId();
};

///////////////////////////////////////////////////////////////////////////////
// Invite List

var showInviteList = function () {
  showTemplate("groupInviteList");
};

Template.page.showInviteList = function () {
  return Session.get("showInviteList");
};

Template.groupInviteList.events({
  'click .invite': function (event, template) {
    Meteor.call('invite', Session.get("groupId"), this._id);
  }
});

Template.groupInviteList.uninvited = function () {
  var group = Groups.findOne(Session.get("groupId"));
  if (! group)
    return []; // group hasn't loaded yet
  return Meteor.users.find({$nor: [{_id: {$in: group.invited}},
                                   {_id: group.owner}]});
};

Template.groupInviteList.displayName = function () {
  return displayName(this);
};