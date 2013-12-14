Template.groupActions.helpers({
  groupSlug: function () {
    return ReactiveGroupFilter.get("groupSlug") || Groups.findOne(ReactiveGroupFilter.get("group"), {slug: 1}).slug;
  },
  showMapActions: function () {
    // Show if there is a group but not activity set
    return ReactiveGroupFilter.get("group") && !ReactiveGroupFilter.get("activity")
  },
  showActivityActions: function () {
    var group = Groups.findOne(ReactiveGroupFilter.get("group"));

    if (group && userBelongsToGroup(Meteor.userId(), group._id)) {
      return true;
    }

    return false;
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