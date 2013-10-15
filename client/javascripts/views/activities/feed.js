///////////////////////////////////////////////////////////////////////////////
// Common Functions

this.processActivityPhoto = function (activity) {
  // if activity already has photo
  if (activity.photo) {
    appendFeedPhoto(activity);
    return;
  }

  var group = Groups.findOne(Session.get("groupId"));
  if (activity.picasaTags && _.isObject(group.trovebox)) {
    var params = $.extend({tags: activity.picasaTags, max: 1}, group.trovebox),
        search = new Galleria.Trovebox,
        self = activity;

    search.albumSearch(params, function(data, params) { 
      if (data.length) {
        // get the id for the feed item associated with this photo tag
        // and insert the img into the item
        var activity = Activities.findOne(self._id);

        activity.photo = data[0].image;
        appendFeedPhoto(activity);
      }
    });
  }
}

this.appendFeedPhoto = function (activity) {
  var html = "";

  html += "<div class=\"photo\" style=\"background-image: url(" + activity.photo + ")\">";
  html +=   "<img src='" + activity.photo + "'/>";
  html += "</div>";
  
  var existingPhoto = $("#" + activity._id + " .activity .photo");
  if (!existingPhoto.length) {
    $("#" + activity._id + " .activity").append(html);
  }
}

///////////////////////////////////////////////////////////////////////////////
// Activity feed 

var feedLimitSkip = 5;
var dashboardMap = null;
var dashboardMapBounds = null;

Template.activityFeed.helpers({
  feedTitle: function() {
    text = "All Activities";
    if (!Template.feedList.feedLimitReached()) {
      text = "Last " + Session.get("feedLimit") + " Activities";
    }

    // larger displays
    var html = "<h4 class=\"hide-for-small\">";
    html += Template.feedList.feedLimitReached() ? "All Activities" : "Last " + Session.get("feedLimit") + " Activities";
    if (Template.feedList.moreActivities()) {
      html += "<span class=\"sub-header\"><a href=\"#\" class=\"feed-all\">Show all</a></span>";
    }
    html += "</h4>";

    var h5Style = "wide";
    if (Session.get("feedLimit") > 9) {
      h5Style = "wider";
    }

    // small displays
    html += "<h4 class=\"show-for-small " + h5Style + "\">Last " + Session.get("feedLimit") + "</h4>";

    html += "<h5 class=\"show-for-small " + h5Style + "\">Activities";
    if (Template.feedList.moreActivities()) {
      html += "<span class=\"sub-header\"><a href=\"#\" class=\"feed-all\">Show all</a></span>";
    }
    html += "</h5>";

    return new Handlebars.SafeString(html);
  }
});

Template.activityFeed.events({
  'click .new-short': function (event, template) {
    $(".short-form.row").show().find("textarea").focus();
    return false;
  },
  "click .new-story": function () {
    Router.setNewActivity(getCurrentGroup());
    return false;
  },
  "click a.feed-all": function () {
    Session.set("feedLimit", Template.activityFeed.activityCount() + 1);
    return false;
  }
});

Template.activityFeed.loading = function () {
  return (typeof(feedListSubscription) == 'object' && !feedListSubscription.ready()) && 
         (typeof(feedMapSubscription) == 'object' && !feedMapSubscription.ready());
};

Template.activityFeed.showExtras = function () {
  // FIXME: this needs to be dynamic (maybe) based on the screen size
  //        also, the value of 767 shouldn't be hard coded - get it from the css??
  return true //parseInt($("body").css("width").match(/\d+/g)) > 767
};

Template.activityFeed.created = function() {
  var filter = Session.get("feedFilter");
  logIfDev("[+] FeedFilter set here (1)");
  Session.set("feedFilter", $.extend(filter, {group: Session.get("groupId")}));
  Session.set("galleryLimit", galleryLimitSkip);
};

Template.activityFeed.rendered = function () {
  // Create an event to be triggered when map element is in the DOM
  // See hack here: http://jsfiddle.net/Zzw2M/33/light/
  $(".feed-list").removeClass("faded");
};

Template.activityFeed.userBelongsToGroup = function () {
  return currentUserBelongsToCurrentGroup();
};

Template.activityFeed.activityCount = function () {
  return Activities.find(Session.get("feedFilter")).count();
};

Template.activityFeed.totalActivities = function () {
  return Activities.find(Session.get("feedFilter")).count();
}

///////////////////////////////////////////////////////////////////////////////
// Activity feed list

Template.feedList.events({
  "click .feed-more a": function () {
    Session.set("feedLimit", Session.get("feedLimit") + feedLimitSkip);
    return false;
  }
})

Template.feedList.anyActivities = function () {
  return Template.activityFeed.activityCount() > 0;
};

Template.feedList.recentActivities = function () {
  // never return activities without a group
  return Activities.find(Session.get("feedFilter"), {sort: {created: -1}, limit: Session.get("feedLimit")});
};

Template.feedList.feedLimitReached = function () {
  return Session.get("feedLimit") >= Activities.find(Session.get("feedFilter")).count();
};

// FIXME: this is a hack! Should be able to use "unless" feedLimitReached in template
//        but it only seems to work for a single reference.
Template.feedList.moreActivities = function() {
  return Session.get("feedLimit") < Activities.find(Session.get("feedFilter")).count();
};

///////////////////////////////////////////////////////////////////////////////
// Feed Item View

// Template.short.preserve([".short.entry.expanded"]);

Template.feedItem.events({
  'click .remove': function (event, template) {
    $(template.find(".comment")).addClass("disabled");
    Comments.remove(this._id);

    return false;
  },
  'mouseenter .comment': function (event, template) {
    $(template.find(".remove")).show();
  },
  'mouseleave .comment': function (event, template) {
    $(template.find(".remove")).hide();
  },
  'click .activity a.title': function (event, template) {
    Router.setActivity(this);
    return false;
  },
  'click .item-actions a.comments': function (event, template) {
    toggleComments(template);
    return false;
  },
  'click .item-actions .new-comment a': function (event, template) {
    if (!!$(event.target).closest("a").hasClass("disabled")) {
      return false;
    }

    toggleComments(template, true, true);
    return false;
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
  var id = item.attr("id");
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
// Story Feed Content

Template.storyFeedContent.helpers({
  photo: function () {
    processActivityPhoto(this);
  },
});

Template.storyFeedContent.events({
  'mouseenter .activity': function (event, template) {
    $(template.find(".actions")).show();
  },
  'mouseleave .activity': function (event, template) {
    $(template.find(".actions")).hide();
  },
});

Template.storyFeedContent.canRemove = function () {
  return canUserRemoveActivity(Meteor.userId(), this._id);
};

Template.storyFeedContent.textPreview = function () {
  var text = this.text;
  if (!text)
    return "";

  var limit = 180;

  var preview = text.substring(0, limit);
  if(text.length > limit)
    preview += "...";

  return preview;
};

///////////////////////////////////////////////////////////////////////////////
// Feed Item Actions

Template.feedItemActions.hasComments = function () {
  return Comments.find({activityId: this._id}).count() > 0;
};

Template.feedItemActions.countText = function () {
  var count = Comments.find({activityId: this._id}).count();
  var text = count;

  text += (count > 1 || count == 0) ? " comments" : " comment";

  return text;
};

///////////////////////////////////////////////////////////////////////////////
// Feed Item Comments

commentsScrollOk = true;
setInterval(function () {
    commentsScrollOk = true;
}, 50);

Template.feedItemComments.events({
  "scroll .short-comments .inner": function (event, template) {
    if (commentsScrollOk === true) {
      commentsScrollOk = false;

      setFeedCommentsNotice(template);
    }
  },
  "click .comments-notice > .inner": function (event, template) {
    var list = template.find(".short-comments .inner");

    list.scrollTop = list.scrollHeight;
  }
});

Template.feedItemComments.rendered = function () {
  setFeedCommentsNotice(this);
};

hideFeedCommentsNotice = function (item) {
  item.find(".comments-notice .inner").hide();
};

setFeedCommentsNotice = function (template) {
  var commentsView    = $(template.find(".short-comments > .inner")),
      commentsNotice  = $(template.find(".comments-notice > .inner")),
      viewportHeight  = commentsView.outerHeight(),
      hiddenComments  = [];
  
  commentsView.find(".comment").each( function(index, comment) {
    if ($(comment).position().top > viewportHeight - 60) {
      hiddenComments.push(comment);
    }
  });

  if(hiddenComments.length > 0) {
    var commentText = hiddenComments.length > 1 ? "comments" : "comment";
    commentsNotice.text(hiddenComments.length + " " + commentText);

    // FIXME: We shouldn't assume the parent is a .feed-item. Maybe the parent
    //        should be set when this class is created and it should be set on
    //        here as a property, eg delegate.
    if ($(template.firstNode).closest(".feed-item").hasClass("expanded"))
      commentsNotice.show();
  } else {
    commentsNotice.text("").hide();
  }
}

///////////////////////////////////////////////////////////////////////////////
// Feed Map

Template.feedMap.rendered = function() {
  setupMap();
};

Template.feedMap.destroyed = function() {
  logIfDev("[-] Destroying Google Maps...");
  Session.set('feedMap', false);
};

setupMap = function () {
  logIfDev("[+] Inner Map Rendered...");

  if (! Session.get('feedMap'))
    gmaps.initialize();

  Deps.autorun(function(computation) {
    if (isDev()) {
      computation.onInvalidate(function() {
        console.trace();
      });
    }

    logIfDev("[+] Autorun Map Deps...");

    var recentActivities = Activities.find(Session.get("feedFilter"), {sort: {created: -1}}).fetch();
    gmaps.clearMarkers();
  
    if (recentActivities.length > 0) {
      logIfDev("[+] Processing Map Data...");

      _.each(recentActivities, function(activity) {
        if (typeof activity.lat !== 'undefined' &&
            typeof activity.lng !== 'undefined') {

          var objMarker = {
            id: activity._id,
            lat: activity.lat,
            lng: activity.lng,
            type: activity.type
            // title: acvtivity.name
          };

          // check if marker already exists
          if (!gmaps.markerExists('id', objMarker.id)) {
            gmaps.addMarker(objMarker);
          }
        }
      });
      gmaps.calcBounds();
    }
  });
}

///////////////////////////////////////////////////////////////////////////////
// Feed Gallery

var setupGallery = function () {

  Deps.autorun(function(computation) {
    if (isDev()) {
      computation.onInvalidate(function() {
        console.trace();
      });
    }

    logIfDev("Loading Feed Gallery");

    var group = Groups.findOne(Session.get("groupId"));
    // NOTE: this needs work. shouldn't always assume skip limit is max loaded
    var limit = galleryLimitSkip;
    var offset = Session.get("galleryLimit") - limit;

    var self = this;
    $(".gallery-more a").addClass("disabled");

    if (_.isObject(group.trovebox)) {
      var params = $.extend({}, group.trovebox);

      if (Session.get("feedFilter").country)
        params.tags = Session.get("feedFilter").country;

      troveboxGallery.albumSearch(params, function(data) {
        if (_.isEmpty(data)) {
          $(".feed-extra").addClass("no-photos");
        } else {
          $(".feed-extra").removeClass("no-photos");
          // reverse the order to get newest to oldest and then process gallery
          processFeedPhotos(data.reverse(), offset, ".recent-photos");
        }
      });            
    } else if (group.picasaUsername) {
      var params = {};

      if (_.isString(group.picasaKey) && group.picasaKey.length)
        params.authkey = group.picasaKey;

      if (Session.get("galleryLimit") > limit)
        params["start-index"] = offset;

      picasaGallery.setOptions({
        max: limit
      }).useralbum(group.picasaUsername, group.picasaAlbum, params, function(data) {
        processFeedPhotos(data.reverse(), offset, ".recent-photos");
      });
    } 
  });
};

var processFeedPhotos = function (data, offset, galleryContainer) {
  if (offset > 0 && Galleria.length) { // Append data to existing gallery
    var gallery = Galleria.get(0);
    var currentLength = gallery.getDataLength();

    var t = gallery.push(data, function () {
      // Skip to the first of the images just fetched
      this.show(this.getDataLength() - data.length);
    });

  } else { // Create initial gallery
    feedGallery = Galleria.run(galleryContainer, {
      dataSource: data,
      _toggleInfo: false,
      debug: isDev(),
      extend: function(s) {
        // create an element 'galleria-map'
        this.addElement('map');
        // add to default 'galleria-container' 
        this.appendChild('container', 'map');

        if (! Galleria.TOUCH ) {
          this.addIdleState( this.get('map'), { opacity: 0 });
          this.addIdleState( this.get('info'), { opacity: 0 });
        }

        var gallery = this; 
        gallery.attachKeyboard({
          left: gallery.prev,
          right: gallery.next,
        });
        
        $('.galleria-image').click(function(event) {
          var galleria = $(event.target).closest(".galleria-container");
          var container = $(event.target).closest(".gallery");

          if (galleria.hasClass("fullscreen")) {
            event.preventDefault();

            // gallery.defineTooltip("fullscreen", s._locale.exit_fullscreen);
            gallery.addIdleState(gallery.$("bar"), {
              bottom: -31
            });
          } else if (! container.hasClass("visible")) {
            container.addClass("visible");
          }
        });

        $("#fullscreen").click(function() {
          event.preventDefault();
          gallery.enterFullscreen(); 
        });
      }
    });
  }
};

Template.feedGallery.rendered = function() {
  setupGallery();
};

Template.feedGallery.events({
  "click .gallery-more a": function () {
    if ($(".gallery-more a").hasClass("disabled"))
      return false;

    Session.set("galleryLimit", Session.get("galleryLimit") + galleryLimitSkip);
    return false;
  },
  "click .galleria-map": function () {
    $(".gallery").removeClass("visible");
  }
})

Template.feedGallery.helpers({
  gallery: function () {
    return new Handlebars.SafeString("<p class=\"alert-box\"></p>");
  }
});

Template.feedGallery.group = function () {
  return Groups.findOne({_id: Session.get("groupId")});
};

Template.feedGallery.picasaGalleryUrl = function () {
  var group = Groups.findOne({_id: Session.get("groupId")});
  var picasaPath = [group.picasaUsername, group.picasaAlbum].join("/");

  if(group.picasaKey)
    picasaPath += "?authkey=" + group.picasaKey;

  return "https://picasaweb.google.com/" + picasaPath;
};

Template.feedGallery.hasGallery = function () {
  var group = Groups.findOne({_id: Session.get("groupId")});
  if (!group) {
    return false
  } else {
    return _.isObject(group.trovebox) || !!group.picasaUsername
  }
};

Template.feedGallery.destroyed = function () {
  if (Galleria.length)
    Galleria.get(0).destroy();
};

///////////////////////////////////////////////////////////////////////////////
// Common Functions

var recentActivitiesMap = function() {
  var dimensions = "640x240";
  var recentActivities = Activities.find({group: getCurrentGroupId()}, {limit: 100, sort: {created: -1}});
  var apiKey = appSettings().mapsApiKey;

  // FIXME: The code here shouldn't need to know about DOM elements.
  if(parseInt($("body").css("width").match(/\d+/g)) > 767)
    dimensions = "640x400";

  imageUrl = "http://maps.googleapis.com/maps/api/staticmap?_=:random&sensor=false&size=:dimensions&maptype=roadmap";
  imageUrl = imageUrl.replace(/:dimensions/, dimensions).
                      replace(/:random/, Math.round((new Date()).getTime() / 1000));

  if(apiKey != "")
    imageUrl = imageUrl + "&key=" + apiKey;

  recentActivities.forEach(function (activity) {
    if(activity.lat && activity.lng) {
      imageUrl += "&visible=:lat,:lng&markers=color:green|label::label|:lat,:lng";
      imageUrl = imageUrl.replace(/:lng/g, activity.lng).
                          replace(/:lat/g, activity.lat).
                          replace(/:label/, activity.location);
    }
  });

  return imageUrl;
};