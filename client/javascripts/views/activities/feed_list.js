///////////////////////////////////////////////////////////////////////////////
// Activity feed 

var feedLimitSkip = 5;

Template.activityFeed.helpers({
  feedTitle: function() {
    text = "All Activities";
    if (!Template.feedList.feedLimitReached()) {
      text = "Last " + ReactiveGroupFilter.get("limit") + " Activities";
    }

    // larger displays
    var html = "<h4 class=\"hide-for-small\">";
    html += Template.feedList.feedLimitReached() ? "All Activities" : "Last " + ReactiveGroupFilter.get("limit") + " Activities";
    if (Template.feedList.moreActivities()) {
      html += "<span class=\"sub-header\"><a href=\"#\" class=\"feed-all\">Show all</a></span>";
    }
    html += "</h4>";

    var h5Style = "wide";
    if (ReactiveGroupFilter.get("limit") > 9) {
      h5Style = "wider";
    }

    // small displays
    html += "<h4 class=\"show-for-small " + h5Style + "\">Last " + ReactiveGroupFilter.get("limit") + "</h4>";

    html += "<h5 class=\"show-for-small " + h5Style + "\">Activities";
    if (Template.feedList.moreActivities()) {
      html += "<span class=\"sub-header\"><a href=\"#\" class=\"feed-all\">Show all</a></span>";
    }
    html += "</h5>";

    return new Handlebars.SafeString(html);
  }
});

Template.activityFeed.events({
  "click a.feed-all": function () {
    event.stopPropagation();
    event.preventDefault();

    ReactiveGroupFilter.set("limit", Activities.find(ReactiveGroupFilter.get('queryFields')).count() + 1);
  }
});

Template.activityFeed.loading = function () {
  return (typeof(feedListSubscription) == 'object' && !feedListSubscription.ready()) && 
         (typeof(feedMapSubscription) == 'object' && !feedMapSubscription.ready());
};

Template.activityFeed.rendered = function () {
  // Create an event to be triggered when map element is in the DOM
  // See hack here: http://jsfiddle.net/Zzw2M/33/light/
  $(".feed-list").removeClass("faded");
};

Template.activityFeed.userBelongsToGroup = function () {
  return currentUserBelongsToCurrentGroup();
};

// FIXME: these two functions need to be fixed. What should each return?
Template.activityFeed.activityCount = function () {
  return Activities.find(ReactiveGroupFilter.get('queryFields')).count();
};

Template.activityFeed.totalActivities = function () {
  return Activities.find(ReactiveGroupFilter.get('queryFields')).count();
}

///////////////////////////////////////////////////////////////////////////////
// Activity feed list

Template.feedList.events({
  "click .feed-more a": function () {
    event.stopPropagation();
    event.preventDefault();

    ReactiveGroupFilter.set("limit", ReactiveGroupFilter.get("limit") + feedLimitSkip);
  }
});

Template.feedList.anyActivities = function () {
  return Activities.find(ReactiveGroupFilter.get('queryFields')).count() > 0;
};

Template.feedList.recentActivities = function () {
  // never return activities without a group
  return Activities.find(ReactiveGroupFilter.get('queryFields'), {sort: {created: -1}, limit: ReactiveGroupFilter.get("limit")});
};

Template.feedList.feedLimitReached = function () {
  var groupInfo = GroupInfo.findOne(),
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

};

// FIXME: this is a hack! Should be able to use "unless" feedLimitReached in template
//        but it only seems to work for a single reference.
Template.feedList.moreActivities = function() {
  return ReactiveGroupFilter.get("limit") < Activities.find(ReactiveGroupFilter.get('queryFields')).count();
};

///////////////////////////////////////////////////////////////////////////////
// Feed Item View

// Template.short.preserve([".short.entry.expanded"]);

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
  }
});

Template.itemActions.hasComments = function () {
  return Comments.find({activityId: this._id}).count() > 0;
};

Template.itemActions.countText = function () {
  var count = Comments.find({activityId: this._id}).count();
  var text = count;

  text += (count > 1 || count == 0) ? " comments" : " comment";

  return text;
};