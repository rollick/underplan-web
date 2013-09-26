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
  'click .groups a, click .groups .panel': function (event, template) {
    Router.setGroup(this);
    return false;
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
// Groups List Item

Template.groupItem.events({
  "click .follow-group a": function (event, template) {
    var followed = ! $(event.target).hasClass("followed");

    followGroup(this._id, followed);

    var text = $(event.target).siblings('.text');
    text.hide().toggleClass('follow', followed).animate({
      width: 'show'
    }, 200, function () {
      var self = this;
      setTimeout(
        function() 
        {
          $(self).animate({
            width: 'hide'
          }, 500);
        }, 2000);
    });
    return false;
  }
});

Template.groupItem.userCanFollow = function () {
  // can follow if logged in but not a group member
  return !!Meteor.user() && !currentUserBelongsToCurrentGroup()
};

Template.groupItem.followingGroup = function () {
  return isFollowingGroup(Meteor.userId(), this._id);
};

// override this method to specify a different short
Template.groupItem.group = function() {
  return this;
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
    return false;
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
    return false;
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
  values.picasaKey   =      template.find(".picasa-key").value;

  values.trovebox = {
    domain:   template.find(".trovebox-domain").value,
    album:    template.find(".trovebox-album").value,
    albumKey: template.find(".trovebox-albumKey").value
  }

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
  return isGroupAdmin(Meteor.userId(), getCurrentGroupId());
};

///////////////////////////////////////////////////////////////////////////////
// Invite List

// Template.page.showInviteList = function () {
//   return Session.get("showInviteList");
// };

Template.groupInviteList.events({
  'click .invite': function (event, template) {
    Meteor.call('invite', Session.get("groupId"), this._id);
    return false;
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