Template.groupActions.helpers({
  showActions: function () {
    // Show if there is a group but not activity set
    return ReactiveGroupFilter.get("group") && !ReactiveGroupFilter.get("activity")
  }
});