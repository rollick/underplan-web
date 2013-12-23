///////////////////////////////////////////////////////////////////////////////
// Group Activity Actions

Template.groupActivityActions.helpers({
  activity: function () {
    return {};
  },
});

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

    if(Session.equals("mainTemplate", "groupMain")) {
      // Route to Feed List
      if (country)
        Router.setGroupFeedAndCountry(group, country);
      else
        Router.setGroupFeed(group);
    } else {
      // Route to Map
      if (country)
        Router.setGroupAndCountry(group, country);
      else
        Router.setGroup(group);
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
    var groupInfo = GroupInfo.findOne();
    
    if (groupInfo)
      return _.keys(groupInfo.counts).length > 0;
    else
      return false;
  },
  showActivityCountControl: function () {
    // only show count control for map view
    return mappingFsm.state !== "hideMap";
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