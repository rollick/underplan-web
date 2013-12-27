///////////////////////////////////////////////////////////////////////////////
// Groups Home

Template.mainHome.events({
  'click .new-group': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    Router.setNewGroup();
  },
  'click .list .groups a, click .groups .panel': function (event, template) {
    event.stopPropagation();
    event.preventDefault();
    
    Router.setGroup(this);
  },
  'click .alert-box a.close': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    Session.set("message", null);
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
    event.stopPropagation();
    event.preventDefault();

    var followed = ! $(event.target).hasClass("followed");

    followGroup(this._id, followed);

    var text = $(event.target).siblings('.text');
    text.hide().toggleClass('follow', followed).animate({
      width: ['show', 'swing'],
      opacity: [1.0, 'linear']
    }, 200, function () {
      var self = this;
      setTimeout(
        function() 
        {
          $(self).animate({
            width: ['hide', 'swing'],
            opacity: [0, 'linear']
          }, 500);
        }, 2000);
    });
  }
});

Template.groupItem.helpers({
  userCanFollow: function () {
    // can follow if logged in but not a group member
    return !!Meteor.user() && !currentUserBelongsToCurrentGroup()
  },
  followingGroup: function () {
    return isFollowingGroup(Meteor.userId(), this._id);
  },
  group: function() {
    return this;
  },
  followedCls: function () {
    return (isFollowingGroup(Meteor.userId(), this._id) ? "followed" : "");
  }
});

///////////////////////////////////////////////////////////////////////////////
// Groups Editor

Template.groupEditor.events({
  'click .save': function (event, template) {
    var values = getGroupValues(template);

    if (values.name.length && values.description.length) {
      Meteor.call('createGroup', values, function (error, groupId) {
        if (! error) {
          Session.set("groupId", groupId);
          var group = Groups.findOne(ReactiveGroupFilter.get("group"));

          if(group && group.approved) {
            Router.setGroup(Groups.findOne(ReactiveGroupFilter.get("group")));
          } else {
            Session.set("message",
                  "Your group is awaiting approval");
            Router.setHome();
          }
        }
      });
    } else {
      Session.set("displayError",
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
      Session.set("displayError",
                  "It needs a name and a description");
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
  return Session.get("displayError");
};

Template.groupEditor.group = function () {
  return Groups.findOne(ReactiveGroupFilter.get("group"));
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
    event.stopPropagation();
    event.preventDefault();

    Router.setGroupMembership(Groups.findOne(ReactiveGroupFilter.get("group")));
  },

  'click .group-settings': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    Router.setGroupEditor(Groups.findOne(ReactiveGroupFilter.get("group")));
  }
});

Template.groupAdminActions.isGroupAdmin = function () {
  return isGroupAdmin(Meteor.userId(), ReactiveGroupFilter.get("group"));
};

///////////////////////////////////////////////////////////////////////////////
// Invite List

// Template.page.showInviteList = function () {
//   return Session.get("showInviteList");
// };

Template.groupInviteList.events({
  'click .invite': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    Meteor.call('invite', ReactiveGroupFilter.get("group"), this._id);
  },
  'click .cancel': function () {
    event.stopPropagation();
    event.preventDefault();

    Router.setGroup(Groups.findOne(ReactiveGroupFilter.get("group")));
  }
});

Template.groupInviteList.invited = function () {
  return Meteor.users.find({$and: [{_id: {$in: Groups.findOne(ReactiveGroupFilter.get("group")).invited}}]});
};

Template.groupInviteList.uninvited = function () {
  var group = Groups.findOne(ReactiveGroupFilter.get("group"));
  if (! group)
    return []; // group hasn't loaded yet
  return Meteor.users.find({$nor: [{_id: {$in: group.invited}},
                                   {_id: group.owner}]});
};

Template.groupInviteList.displayName = function () {
  return displayName(this);
};