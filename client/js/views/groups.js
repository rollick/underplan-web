Template.page.showGroupList = function () {
  return Session.get("showGroupList");
};

Template.page.showGroupEditor = function () {
  return Session.get("showGroupEditor");
};

///////////////////////////////////////////////////////////////////////////////
// Groups Home

Template.mainHome.events({
  'click .new-group': function (event, template) {
    if(Meteor.userId()) {
      Router.setNewGroup();
    } else {
      Session.set("message",
                  "You must be logged in to create a group");
      Router.setHome();
    }
    return false;
  }
});

Template.mainHome.events({
  'click .groups a': function (event, template) {
    Router.setGroup(this);
  },
  'click .alert-box a.close': function (event, template) {
    Session.set("message", null);
    return true;
  }
});

Template.mainHome.groups = function () {
  return Groups.find({}, {sort: {created: -1}});
};

Template.mainHome.message = function () {
  return Session.get("message");
};

///////////////////////////////////////////////////////////////////////////////
// Groups Editor

Template.groupEditor.events({
  'click .save': function (event, template) {
    var values = getGroupValues(template);

    if (values.name.length && values.description.length) {
      Meteor.call('createGroup', values, function (error, groupId) {
        if (! error) {
          Session.set("groupId", groupId);
          var group = getCurrentGroup();

          if(group && group.approved) {
            Router.setGroup(getCurrentGroup());
          } else {
            Session.set("message",
                  "Your group is awaiting approval");
            Router.setHome();
          }
        }
      });
    } else {
      Session.set("createError",
                  "It needs a name and description");
    }
  },
  'click .update': function (event, template) {
    var groupId = template.find(".id").value;
    var values = getGroupValues(template);

    if (values.name.length && values.description.length) {
      Groups.update({_id: groupId}, {$set: values});
      Router.setGroup(Groups.findOne(groupId));
    } else {
      Session.set("createError",
                  "It needs a title and a story");
    }
  },
  'click .cancel-new': function () {
    Router.setHome();
    return false;
  },
  'click .cancel-edit': function () {
    Router.setGroup(this);
    return false;
  }
});

Template.groupEditor.error = function () {
  return Session.get("createError");
};

Template.groupEditor.group = function () {
  return getCurrentGroup();
};

var getGroupValues = function(template) {
  values = {};
  values.name =             template.find(".name").value;
  values.description =      template.find(".description").value;
  values.picasaUsername =   template.find(".picasa-username").value;
  values.picasaAlbum =      template.find(".picasa-album").value;

  return values;
}

var hideGroupEditor = function () {
  $("#groupModal").trigger("reveal:close");
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
    return false;
  },

  'click .group-settings': function (event, template) {
    Router.setGroupEditor(getCurrentGroup());
    return false;
  }
});

Template.groupAdminActions.isGroupAdmin = function () {
  var group = getCurrentGroup();
  return !!group && group.owner === Meteor.userId();
};

///////////////////////////////////////////////////////////////////////////////
// Invite List

Template.page.showInviteList = function () {
  return Session.get("showInviteList");
};

Template.groupInviteList.events({
  'click .invite': function (event, template) {
    Meteor.call('invite', Session.get("groupId"), this._id);
  },
  'click .cancel': function () {
    Router.setGroup(getCurrentGroup());
    return false;
  }
});

Template.groupInviteList.invited = function () {
  return Meteor.users.find({$and: [{_id: {$in: getCurrentGroup().invited}}]});
};

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