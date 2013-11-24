///////////////////////////////////////////////////////////////////////////////
// Common Helpers for Short / Story Item

itemHelpers = {
  mapUrl: function () {
    return activityStaticMap(this);
  },
  hasMap: function () {
    return (this.lat && this.lng);
  },
  photo: function () {
    processActivityPhoto(this);
  },
  canRemove: function () {
    return canUserRemoveActivity(Meteor.userId(), this._id);
  },
  canEdit: function () {
    return (this.owner === Meteor.userId() || isGroupAdmin(Meteor.userId(), ReactiveGroupFilter.get("group")));
  },
  activity: function () {
    return this;
  },
  photoShow: function () {
    var activity = this;

    if (!_.isEmpty(activity.picasaTags)) {
      // show larger gallery if there is no story but there is a 
      // wikipedia article set
      if (_.isEmpty(activity.text) && activity.wikipediaId)
        return true;

      // Or if there is a story text but it is short
      if (activity.text.length < shortMaxLength )
        return true;
    }

    return false;
  },
  hasWiki: function () {
    var activity = this;

    return _.isString(activity.wikipediaId) && activity.wikipediaId.length > 0
  },
  dateCreated: function () {
    return formattedDate(this.created);
  },
  hasPhotos: function () {
    return currentActivityHasPhotos();
  },
  facebookShareUrl: function () {
    if(ReactiveGroupFilter.get("group") && ReactiveGroupFilter.get("activity")) {
      var activity = Activities.findOne(ReactiveGroupFilter.get("activity"));
      var group = Groups.findOne(ReactiveGroupFilter.get("group"));

      if(activity && group) {
        var activityUrl = Meteor.absoluteUrl() + [group.slug, activity.slug].join("/");
        var link = "https://www.facebook.com/dialog/feed?app_id=:appId&link=:activityUrl&name=:activityTitle&description=:activityPreview&redirect_uri=:activityUrl";

        link = link.replace(/:appId/, Meteor.settings.public.fbAppId).
             replace(/:activityUrl/g, encodeURIComponent(activityUrl)).
             replace(/:activityTitle/g, encodeURIComponent(activity.title)).
             replace(/:activityPreview/g, encodeURIComponent(Template.currentActivity.textPreview()));

        // FIXME: work out how to show map in share post if no image available
        var imageUrl = Session.get("activityImageUrl");
        // var mapUrl = Session.get("activityMapUrl");
        if (!!imageUrl) {
          link += "&picture=" + encodeURIComponent(imageUrl);
        // } else if (!!mapUrl) {
        //   link += "&picture=" + encodeURIComponent(mapUrl); 
        }

        if (!!activity.country && !!activity.city) {
          link += "&caption=" + encodeURIComponent(activity.city + ", " + activity.country);
        }

        return link;
      }
    }

    return "#";
  },
  wikiContent: function () {
    var domain = "http://www.dbpedialite.org";
    var activity = Activities.findOne(ReactiveGroupFilter.get("activity"));

    $.ajax({
      url: domain + "/things/" + activity.wikipediaId + ".jsonld",
      type: 'get',
      dataType: 'json',
      success: function( data, response ) {
        var link = $("<cite />").html($("<a />").html("Wikipedia").attr("target", "_blank").attr("href", data["@graph"][0]["@id"]));
        $(".wiki").html(data["@graph"][1]["rdfs:comment"]).append(link);
      }
    });

    return new Handlebars.SafeString("<blockquote class=\"wiki\">Loading wiki...</blockquote>");
  },
  gallery: function () {
    var group = Groups.findOne(ReactiveGroupFilter.get("group"));
    var activity = Activities.findOne(ReactiveGroupFilter.get("activity"));
    var element = ".activity-highlight";

    if (_.isObject(group.trovebox)) {
      var params = $.extend({}, group.trovebox);

      // Need to change field name for tags to something like photoTags
      if (_.isString(activity.picasaTags) && activity.picasaTags.length)
        params.tags = activity.picasaTags;

      params.max = 999;

      troveboxGallery.albumSearch(params, function(data) {
        Galleria.run(element, {
          dataSource: data,
          showInfo: true,
          thumbnails: false,
          debug: isDev(),
          extend: function(options) {
            // this.$('thumbnails').hide();
          }
        });
      });            
      
    } else if (group.picasaUsername) {
      var params = {};

      if (_.isString(group.picasaKey) && group.picasaKey.length)
        params.authkey = group.picasaKey

      if (_.isString(activity.picasaTags) && activity.picasaTags.length)
        params.tag = activity.picasaTags;

      // Note: Hope there isn't more in this story...
      picasaGallery.setOptions({
        max: 999
      }).useralbum(group.picasaUsername, group.picasaAlbum, params, function(data) {
        Galleria.run(element, {
          dataSource: data,
          debug: isDev(),
          showInfo: true
        });
      });
    }

    return new Handlebars.SafeString("<p class=\"alert-box clear\">Loading photos...</p>");
  },
  textPreview: function () {
    var text = this.text;
    if (!text)
      return "";

    var limit = 180;

    var preview = text.substring(0, limit);
    if(text.length > limit)
      preview += "...";

    return preview;
  }
};

///////////////////////////////////////////////////////////////////////////////
// Item (Shorty) Content

Template.itemContent.helpers(itemHelpers);

Template.itemContent.events({
  'click .remove': function (event, template) {
    $(template.firstNode).closest(".activity").addClass("disabled");

    Meteor.call('removeActivity', this._id, function (error) {
      if (error) {
        Session.set("createError", [error.error, error.reason].join(": "));
      }
    });

    return false;
  },
  'mouseenter': function (event, template) {
    $(template.find(".actions")).show();
  },
  'mouseleave': function (event, template) {
    $(template.find(".actions")).hide();
  },
});