///////////////////////////////////////////////////////////////////////////////
// Groups Editor

Template.groupEditor.helpers({
    defaultViews: function () {
        return ['Map', 'List'];
    },
    error: function () {
        return Session.get("displayError");
    },
    group: function () {
        return Groups.findOne(ReactiveGroupFilter.get("group"));
    }
});

Template.groupEditor.events({
  'click .save': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

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
  },
  'click .update': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    var groupId = template.find(".id").value;
    var values = getGroupValues(template);

    if (values.name.length && values.description.length) {
      Groups.update({_id: groupId}, {$set: values});
      Router.setGroup(Groups.findOne(groupId));
    } else {
      Session.set("displayError",
                  "It needs a name and a description");
    }
  },
  'click .cancel-new': function () {
    event.stopPropagation();
    event.preventDefault();

    Router.setHome();
  },
  'click .cancel-edit': function () {
    event.stopPropagation();
    event.preventDefault();

    Router.setGroup(this);
  }
});

var getGroupValues = function(template) {
  values = {};
  values.name =             template.find(".name").value;
  values.description =      template.find(".description").value;
  values.defaultView =      template.find(".default-view option:selected").value;
  values.hidden =           template.find(".hidden").checked;

  if (template.find(".gallery-slug")) {
    values.gallery = {
      slug:   template.find(".gallery-slug").value,
      answer: template.find(".gallery-answer").value
    }
  }

  if (template.find(".picasa-username")) {
    values.picasaUsername =   template.find(".picasa-username").value;
    values.picasaAlbum =      template.find(".picasa-album").value;
    values.picasaKey   =      template.find(".picasa-key").value;
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

Template.groupAdminActions.helpers({
  isGroupAdmin: function () {
    return isGroupAdmin(Meteor.userId(), ReactiveGroupFilter.get("group"));
  }
});

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

Template.groupInviteList.helpers({
  invited: function () {
    return Meteor.users.find({$and: [{_id: {$in: Groups.findOne(ReactiveGroupFilter.get("group")).invited}}]});
  },
  uninvited: function () {
    var group = Groups.findOne(ReactiveGroupFilter.get("group"));
    if (! group)
      return []; // group hasn't loaded yet
    return Meteor.users.find({$nor: [{_id: {$in: group.invited}},
                                     {_id: group.owner}]});
  },
  displayName: function () {
    return displayName(this);
  }
});

///////////////////////////////////////////////////////////////////////////////
// Group Activity Actions

Template.groupActivityActions.helpers({
  activity: function () {
    return {};
  },
});

Template.groupActivityActions.events({
  'mouseleave #share': function (event, template) {
    if (template._inactiveTimer)
      clearTimeout(template._inactiveTimer);

    template._inactiveTimer = setTimeout(function () {
      var content = $(event.target);
      content.foundation('dropdown', 'close', content);
    }, 1000);
  },
  'mouseenter #share': function (event, template) {
    if (template._inactiveTimer)
      clearTimeout(template._inactiveTimer);
  },
})

Template.groupActivityActions.rendered = function () {
  $(this.firstNode).foundation('dropdown');
};

///////////////////////////////////////////////////////////////////////////////
// Group Actions

Template.mapFeedListToggle.events({
  "click a.action": function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    var country = ReactiveGroupFilter.get("country"),
        group = Groups.findOne(ReactiveGroupFilter.get("group"));

    if(mappingFsm.equals("state", "hideMap")) {
      // Route to Map
      if (country)
        Router.setGroupAndCountry(group, country);
      else
        Router.setGroup(group);
    } else {
      // Route to Feed List
      if (country)
        Router.setGroupFeedAndCountry(group, country);
      else
        Router.setGroupFeed(group);
    }
  }
});

Template.mapFeedListToggle.helpers({
  toggleCls: function () {
    if(mappingFsm.equals("state", "hideMap")) {
      return "map-toggle";
    } else {
      return "feed-toggle";
    }
  },
  // TODO: generate the actual urls... or not??
  toggleUrl: function () {
    return "#";
  }
})

///////////////////////////////////////////////////////////////////////////////
// Group Actions

Template.groupActions.helpers({
  groupSlug: function () {
    return ReactiveGroupFilter.get("groupSlug") || Groups.findOne(ReactiveGroupFilter.get("group"), {slug: 1}).slug;
  },
  showMapActions: function () {
    // Show if there is a group but not activity set
    return !!ReactiveGroupFilter.get("group");
  },
  showActivityActions: function () {
    var group = Groups.findOne(ReactiveGroupFilter.get("group"));

    if (group && userBelongsToGroup(Meteor.userId(), group._id)) {
      return true;
    }

    return false;
  },
  showCountryFilter: function () {
    var groupId = ReactiveGroupFilter.get("group"),
        groupInfo = GroupInfo.findOne(groupId);
    
    if (groupInfo)
      return _.keys(groupInfo.counts).length > 1;
    else
      return false;
  },
  showActivityCountControl: function () {
    // only show count control for map view
    return !mappingFsm.equals("state", "hideMap");
  },
  groupCls: function () {
    var mapState = mappingFsm.get("state");
    if (mapState === "hideMap") {
      return "feed";
    } else if (mapState === "showSettings") {
      return "hide";
    } else {
      return "";
    }
  }
});

Template.groupActions.events({
  "click .new-shorty": function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    var group = Groups.findOne(ReactiveGroupFilter.get("group"));
    Router.setNewShorty(group);
  }
});