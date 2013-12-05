///////////////////////////////////////////////////////////////////////////////
// Common Helpers for Short / Story Item

itemHelpers = {
  htmlText: function () {
    return Template._markdown.withData({text: this.text});
  },
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
  editUrl: function () {
    if (this.type === "story")
      return "/" + Groups.findOne(this.group).slug + "/" + this.slug + "/edit";
    else if (this.type === "short")
      return "/" + Groups.findOne(this.group).slug + "/pl/" + this._id + "/edit";
    return "";
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
      if (activity.text && activity.text.length < shortMaxLength )
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
  textPreview: function () {
    var text = this.text;
    if (!text)
      return "";

    var limit = 180;

    var preview = text.substring(0, limit);
    if(text.length > limit)
      preview += "...";

    return preview;
  },
  isStory: function () {
    return (this.type === "story");
  },
  infoSectionCls: function () {
    return (this.lat && this.lng) ? "map" : "";
  }
};

///////////////////////////////////////////////////////////////////////////////
// Item (Shorty) Content

Template.itemContent.helpers(itemHelpers);

Template.itemContent.events({
  'click .remove': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    var button = $(event.target);
    if (button.hasClass("ready")) {
      $(template.firstNode).closest(".activity").addClass("disabled");

      Meteor.call('removeActivity', this._id, function (error) {
        if (error) {
          Session.set("createError", [error.error, error.reason].join(": "));
        }
      });
    } else {
      button.addClass("ready");

      // after 2 secs reset the button state
      setTimeout( function () {
        button.removeClass("ready");
      }, 2000);
    }
  },
  'mouseenter': function (event, template) {
    $(template.find(".actions")).show();
  },
  'mouseleave': function (event, template) {
    $(template.find(".actions")).hide();
  },
});