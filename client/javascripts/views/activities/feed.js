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
  return _.isNull(activitiesSubscription) || !activitiesSubscription.ready();
};

Template.activityFeed.showExtras = function () {
  // FIXME: this needs to be dynamic (maybe) based on the screen size
  //        also, the value of 767 shouldn't be hard coded - get it from the css??
  return parseInt($("body").css("width").match(/\d+/g)) > 767
};

Template.activityFeed.created = function() {
  var filter = Session.get("feedFilter");
  Session.set("feedFilter", $.extend(filter, {group: Session.get("groupId")}));
  Session.set("galleryLimit", galleryLimitSkip);
};

Template.activityFeed.rendered = function () {
  // Create an event to be triggered when map element is in the DOM
  // See hack here: http://jsfiddle.net/Zzw2M/33/light/
  setupFeedInserted();
};

Template.activityFeed.destroyed = function () {
  document.removeEventListener('animationstart', feedInsertedEvent);
  document.removeEventListener('MSAnimationStart', feedInsertedEvent);
  document.removeEventListener('webkitAnimationStart', feedInsertedEvent);

  // console.log("Destroyed Activity Feed Template");
  // Session.set("feedLimit", null);
  // Session.set("feedFilter", null);
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

var feedInsertedEvent = null;

this.setupFeedInserted = function () {
  feedInsertedEvent = function(event){
    if (event.animationName == 'feedInserted') {
      // var container = document.querySelector('.feed-list');
      // var options = {
      //   itemSelector: '.feed-item', 
      //   isInitLayout: false, 
      //   gutter: 0
      // };
      // feedPackery = new Packery(container, options);
      // feedPackery.on( 'layoutComplete', function( packery ) {
      //   $(".feed-list").removeClass("faded");
      // });

      // feedPackery.layout();
      $(".feed-list").removeClass("faded");
    }
  } 
  document.addEventListener('animationstart', feedInsertedEvent, false);
  document.addEventListener('MSAnimationStart', feedInsertedEvent, false);
  document.addEventListener('webkitAnimationStart', feedInsertedEvent, false);
}

///////////////////////////////////////////////////////////////////////////////
// Activity feed list

Template.feedList.events({
  "click .feed-more a": function () {
    Session.set("feedLimit", Session.get("feedLimit") + feedLimitSkip);
    return false;
  },
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
    $(event.target).closest(".feed-item").toggleClass("expanded");
    repackFeed();

    return false;
  },
  'click .item-actions .new-comment a': function (event, template) {
    if (!!$(event.target).closest("a").hasClass("disabled")) {
      return false;
    }

    var self = this;
    $(event.target).closest(".feed-item").addClass("expanded");
    $("#" + self._id + " #comment").focus();

    repackFeed();

    return false;
  }
});

Template.feedItem.typeIs = function (what) {
  return this.type === what;
};

Template.feedItem.lastCommented = function () {
  return Session.get("lastUpdatedActivityId") == this._id;
}

Template.feedItem.lastUpdated = function () {
  return this._id == Session.get("lastUpdatedActivity");
}

// override this method to specify a different short
Template.feedItem.activity = function() {
  return this;
};

var toggleComments = function(template) {
  var link = template.find("a.comments");
  var actions = template.find(".short-comments");

  if(link.hasClass("open")) {
    $(actions).toggle();
    $(link).toggleClass("open");
  } else {}
}

///////////////////////////////////////////////////////////////////////////////
// Story Feed Content

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

Template.feedItemComments.events({
  "click .short-comments .inner": function () {
    debugger
  },
});

///////////////////////////////////////////////////////////////////////////////
// Feed Map

Template.feedMap.helpers({
  map: function () {
    if(!!Session.get("feedFilter").group) {
      var group = Groups.findOne(Session.get("feedFilter").group);
      var recentActivities = Activities.find(Session.get("feedFilter"), {sort: {created: -1}, limit: Session.get("feedLimit")});

      // Create an event to be triggered when map element is in the DOM
      // See hack here: http://jsfiddle.net/Zzw2M/33/light/
      event = function(event){
        if (event.animationName == 'mapInserted') {
          generateActivitesMap(group, "#activities-map", recentActivities);
        }
      } 
      document.addEventListener('animationstart', event, false);
      document.addEventListener('MSAnimationStart', event, false);
      document.addEventListener('webkitAnimationStart', event, false);
  
      return new Handlebars.SafeString("<p class=\"alert-box\">Loading map...</p>");
    }
    
  },
});

///////////////////////////////////////////////////////////////////////////////
// Feed Gallery

Template.feedGallery.events({
  "click .gallery-more a": function () {
    if ($(".gallery-more a").hasClass("disabled"))
      return false;

    Session.set("galleryLimit", Session.get("galleryLimit") + galleryLimitSkip);
    return false;
  },
})

Template.feedGallery.helpers({
  gallery: function () {
    var group = Groups.findOne(Session.get("groupId"));
    var params = {};
    // NOTE: this needs work. shouldn't always assume skip limit is max loaded
    var limit = galleryLimitSkip;
    var offset = Session.get("galleryLimit") - limit;

    if (_.isString(group.picasaKey) && group.picasaKey.length)
      params.authkey = group.picasaKey;

    if (Session.get("galleryLimit") > limit)
      params["start-index"] = offset;

    var self = this;
    $(".gallery-more a").addClass("disabled");

    picasa.setOptions({
      max: limit
    }).useralbum(group.picasaUsername, group.picasaAlbum, params, function(data) {

      if (offset > 0) { // Append data to existing gallery
        var gallery = Galleria.get(0);
        var currentLength = gallery.getDataLength();

        var t = gallery.push(data, function () {
          // Skip to the first of the images just fetched
          this.show(this.getDataLength() - data.length);
        });

      } else { // Create initial gallery
        // Galleria.ready(function() {
        //   var gallery = this; // galleria is ready and the gallery is assigned
        //   $('.galleria-image').click(function(event) {
        //     if (! $(event.target).closest(".galleria-container").hasClass("fullscreen")) {
        //       event.preventDefault();
        //       gallery.toggleFullscreen(); // toggles the fullscreen
        //     }
        //   });
        // });

        Galleria.run('.recent-photos', {
          dataSource: data,
          extend: function(s) {
            // var gallery = this; 
            // gallery.attachKeyboard({
            //   left: gallery.prev,
            //   right: gallery.next,
            // });
            
            // $('.galleria-image').click(function(event) {
            //   if (! $(event.target).closest(".galleria-container").hasClass("fullscreen")) {
            //     event.preventDefault();
            //     gallery.toggleFullscreen(); // toggles the fullscreen

            //     // gallery.defineTooltip("fullscreen", s._locale.exit_fullscreen);
            //     gallery.addIdleState(gallery.$("bar"), {
            //       bottom: -31
            //     })
            //   }
            // });

            // $("#fullscreen").click(function() {
            //   event.preventDefault();
            //   gallery.enterFullscreen(); 
            // });
          }
        });
      }
      
      // Hide the more button if no more pics to fetch
      if (data.length < limit) {
        $(".gallery-more a").hide();
      } else {
        $(".gallery-more a").removeClass("disabled");
      }
    });      

    return new Handlebars.SafeString("<p class=\"alert-box\">Loading photos...</p>");
  }
});

Template.feedGallery.group = function () {
  return Groups.findOne({_id: Session.get("groupId")});
};

Template.feedGallery.picasaGalleryUrl = function () {
  var group = getCurrentGroup();
  var picasaPath = [group.picasaUsername, group.picasaAlbum].join("/");

  if(group.picasaKey)
    picasaPath += "?authkey=" + group.picasaKey;

  return "https://picasaweb.google.com/" + picasaPath;
};

Template.feedGallery.destroyed = function () {
  if (Galleria.length)
    Galleria.get(0).destroy();
}

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

var generateActivitesMap = function(group, elementSelector, activities) {
  // exit if google not defined
  if (!_.isObject(window.google))
    return false;

  // load default group if only string passed to function
  if(typeof group === "string" && typeof elementSelector === "undefined") {
    group = getCurrentGroup();
  } else if(typeof elementSelector === "undefined" && typeof elementSelector === "undefined") {
    console.log("No group or container element defined!");
    return false;
  }

  if(!_.isObject(group)) {
    console.log("No current group defined!");
    return false;
  }

  var element = $(elementSelector)[0];
  if(typeof element === "undefined")
    return false;

  if(typeof activities === "undefined")
    activities = Activities.find({group: group._id});

  var locations = [];
  var index = 1;
  var icons = {
    short: "http://maps.google.com/mapfiles/marker.png",
    story: "http://maps.google.com/mapfiles/marker_green.png"
  }

  activities.forEach( function (activity) {
    var lat = parseFloat(activity.lat);
    var lng = parseFloat(activity.lng);

    // if(!isNaN(lat) && !isNaN(lng)) {
      var text = "";
      if(activity.type == "short")
        text = activity.text;

      locations.push(
        {
          lat: activity.lat, 
          lng: activity.lng, 
          text: text, 
          type: activity.type, 
          activityId: activity._id, 
          index: index
        }
      );
      index+=1;
    // }
  });

  dashboardMap = new google.maps.Map(element, {
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  dashboardMapBounds = new google.maps.LatLngBounds();
  var infowindow = new google.maps.InfoWindow();

  var marker, i;

  for (i = 0; i < locations.length; i++) {  
    var latLng = new google.maps.LatLng(locations[i].lat, locations[i].lng);

    marker = new google.maps.Marker({
      position: latLng,
      map: dashboardMap,
      icon: icons[locations[i].type]
    });

    google.maps.event.addListener(marker, 'click', (function(marker, i) {
      return function() {
        var location = locations[i];
        var activity = Activities.findOne(location.activityId);

        if(location.type === "story") {
          Router.setActivity(activity);
        } else {
          var html = Template.shortContent(activity);
          html = "<div class=\"map-info feed-item\">" + html + "</div>";

          infowindow.setContent(html);
          infowindow.open(dashboardMap, marker);
        }
      }
    })(marker, i));

    dashboardMapBounds.extend(latLng);
  }
  dashboardMap.fitBounds(dashboardMapBounds);
};