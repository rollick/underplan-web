///////////////////////////////////////////////////////////////////////////////
// Activity feed 

Template.activityFeed.events({
  "click a.feed-all": function () {
    event.stopPropagation();
    event.preventDefault();

    ReactiveGroupFilter.set("limit", Activities.find(ReactiveGroupFilter.get('queryFields')).count() + 1);
  }
});

Template.activityFeed.rendered = function () {
  // Create an event to be triggered when map element is in the DOM
  // See hack here: http://jsfiddle.net/Zzw2M/33/light/
  $(".feed-list").removeClass("faded");
};

Template.activityFeed.helpers({
  loading: function () {
    return (typeof(feedListSubscription) == 'object' && !feedListSubscription.ready()) && 
           (typeof(feedMapSubscription) == 'object' && !feedMapSubscription.ready());
  },

  userBelongsToGroup: function () {
    return App.belongsToGroup();
  },

  // FIXME: these two functions need to be fixed. What should each return?
  activityCount: function () {
    return Activities.find(ReactiveGroupFilter.get('queryFields')).count();
  },

  totalActivities: function () {
    return Activities.find(ReactiveGroupFilter.get('queryFields')).count();
  }
});

///////////////////////////////////////////////////////////////////////////////
// Activity feed list

Template.feedList.events({
  "click .feed-more .button": function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    if (! $(event.target).hasClass("disabled"))
      ReactiveGroupFilter.set("limit", ReactiveGroupFilter.get("limit") + App.Defaults.feedLimitSkip);
  }
});

Template.feedList.helpers({
  isLoading: function () {
    return !Session.get("feedActivitiesReady");
  },
  loadingCls: function () {
    return Session.get("feedActivitiesReady") ? "" : "disabled";
  },
  anyActivities: function () {
    return Activities.find(ReactiveGroupFilter.get('queryFields')).count() > 0;
  },
  recentActivities: function () {
    // never return activities without a group
    return Activities.find(ReactiveGroupFilter.get('queryFields'), {sort: {created: -1}, limit: ReactiveGroupFilter.get("limit")});
  },
  feedLimitReached: function () {
    var groupId = ReactiveGroupFilter.get("group"),
        groupInfo = GroupInfo.findOne(groupId),
        country = ReactiveGroupFilter.get('country'),
        count = 0;

    if (groupInfo) {
      if (country)
        count = groupInfo.counts[country];
      else
        count = _.reduce(_.values(groupInfo.counts), function(memo, num){ return memo + num; }, 0);

      return ReactiveGroupFilter.get("limit") >= count;
    } else {
      return false;
    }
  }
});


///////////////////////////////////////////////////////////////////////////////
// Feed Item View

Template.feedItem.events({
  'click .activity a.title': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    Router.setActivity(this);
  },
  'click .item-actions a.comments': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    toggleComments(template);
  }
});

Template.feedItem.typeIs = function (what) {
  return this.type === what;
};

Template.feedItem.lastCommented = function () {
  return Session.equals("lastUpdatedActivityId", this._id);
}

Template.feedItem.lastUpdated = function () {
  return Session.equals("lastUpdatedActivity", this._id);
}

// override this method to specify a different short
Template.feedItem.activity = function() {
  return this;
};

Template.feedItem.expandClass = function () {
  var status = activityCommentStatus[this._id];

  if (status == "open") {
    return "expanded";
  } else {
    return "";
  }
};

var toggleComments = function(template, expand, focus) {
  expand = expand || false;
  focus = focus || false;

  var item = $(template.find(".feed-item"));
  var id = item.data().underplanActivityId;

  if (!id)
    throw("Missing activity ID in feed item!");

  var activityIds = Session.get("expandedActivities") || [];

  if (item.hasClass("expanded") && !expand) {
    item.removeClass("expanded");
    hideFeedCommentsNotice(item);
    activityCommentStatus[id] = "closed";
    
  } else {
    item.addClass("expanded");
    setFeedCommentsNotice(template);
    activityCommentStatus[id] = "open";
    activityIds.push(id);
    Session.set("expandedActivities", activityIds);

    if (focus)
      item.find("#comment").focus();
  }
}

///////////////////////////////////////////////////////////////////////////////
// Feed Item Actions

Template.itemActions.helpers({
  commentCls: function () {
    return !!Meteor.userId() ? "" : "disabled";
  },
  
  isLoggedIn: function () {
    return !!Meteor.userId();
  },

  hasComments: function () {
    return Comments.find({activityId: this._id}).count() > 0;
  },

  countText: function () {
    var count = Comments.find({activityId: this._id}).count();
    var text = count;

    text += (count > 1 || count == 0) ? " comments" : " comment";

    return text;
  }
});
