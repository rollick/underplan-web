///////////////////////////////////////////////////////////////////////////////
// Activity view

Template.currentActivity.events({
  'click .edit': function () {
    Router.setEditActivity(getCurrentGroup(), this);
    return false;
  },
  'click .new-comment a': function (event, template) {
    Session.set("createError", null);
    
    $(event.target).closest("a").toggleClass("disabled");
    $(".comment-form.row").toggle();
    return false;
  },
  'click .activity-controls a': function (event, template) {
    Router.setActivity(this);
    return false;
  }
});

Template.currentActivity.nextActivity = function () {
  return Activities.find({
    $and: [
      {group: getCurrentGroupId()},
      {"_id": {"$not": getCurrentActivityId()}}, 
      {type: "story"}, 
      {created: {"$gte": getCurrentActivity().created}}
    ]
  }, {sort: {created: 1, _id: 1}}).fetch()[0];
};

Template.currentActivity.previousActivity = function () {
  return Activities.find({
    $and: [
      {group: getCurrentGroupId()},
      {"_id": {"$not": getCurrentActivityId()}}, 
      {type: "story"}, 
      {created: {"$lte": getCurrentActivity().created}}
    ]
  }, {sort: {created: -1, _id: -1}}).fetch()[0];
};

Template.currentActivity.group = function () {
  return getCurrentGroup();
};

Template.currentActivity.activity = function () {
  return Activities.findOne(getCurrentActivityId());
};

Template.currentActivity.hasPhotos = function () {
  return currentActivityHasPhotos();
};

Template.currentActivity.hasMap = function () {
  return currentActivityHasMap();
};

Template.currentActivity.anyActivities = function () {
  return Activities.find().count() > 0;
};

Template.currentActivity.textPreview = function () {
  var text = getCurrentActivity().text;
  var limit = 160;

  var preview = text.substring(0, limit);
  if(text.length > limit)
    preview += "...";

  return preview;
};

Template.currentActivity.anyComments = function () {
  var activity = getCurrentActivity();

  return Comments.find({activityId: activity._id}).count() > 0;
};

Template.currentActivity.creatorName = function () {
  var owner = Meteor.users.findOne(this.owner);
  if(!owner)
    return "";

  if(owner._id === Meteor.userId())
    return "me";

  return displayName(owner);
};

Template.currentActivity.canRemove = function () {
  return (this.owner === Meteor.userId() || isGroupAdmin(Meteor.userId(), getCurrentGroupId()));
};

Template.currentActivity.canEdit = function () {
  return (this.owner === Meteor.userId() || isGroupAdmin(Meteor.userId(), getCurrentGroupId()));
};

Template.currentActivity.rendered = function() {
  var group = getCurrentGroup();
  var activity = getCurrentActivity();

  ///////////////////////
  // Google Map
  if(activity && currentActivityHasMap) {
    var dimensions = "600x240";
    var zoom = activity.mapZoom || defaultMapZoom;
    var apiKey = appSettings().mapsApiKey;
    
    // FIXME: The code here shouldn't ned to know about DOM elements.
    if(parseInt($("body").css("width").match(/\d+/g)) > 767)
      dimensions = "300x240";

    imageUrl = "http://maps.googleapis.com/maps/api/staticmap?center=:lat,:lng&zoom=:zoom&size=:dimensions&maptype=roadmap&markers=color:green|label::location|:lat,:lng&sensor=false";
    imageUrl = imageUrl.replace(/:dimensions/, dimensions).
                        replace(/:lat/g, activity.lat).
                        replace(/:lng/g, activity.lng).
                        replace(/:zoom/, zoom).
                        replace(/:location/, activity.location);

    if(apiKey != "")
      imageUrl = imageUrl + "&key=" + apiKey;

    mapUrl = "http://maps.google.com/maps?t=h&q=loc::lat,:lng&z=:zoom";
    mapUrl = mapUrl.replace(/:zoom/, zoom).
                    replace(/:lat/g, activity.lat).
                    replace(/:lng/g, activity.lng);

    $(".activity-map").html('<a target="_blank" href="' + mapUrl + '" class="th"><img src="' + imageUrl + '"></a>');
  }

  ///////////////////////
  // Picasa Image (WIP)
  var options = {gridLarge: 10, gridSmall: 4};

  if(group && group.picasaUsername.length && currentActivityHasPhotos()) {
    $.picasa.images(group.picasaUsername, group.picasaAlbum, activity.picasaKey, activity.picasaTags, function(images) {
      var photos = []
      var index = 0;

      $.each(images, function(i, element) {
        photos.push({
          url: element.url, 
          thumbUrl: element.thumbs[0].url,
          caption: element.title
        });

        index += 1;
      });
      
      $(".activity-photos").html(Template.picasaGallery($.extend({photos: photos}, options)));

      // FIXME: implement new clearing code
      $(".activity-photos").foundation("clearing");
    });
  }

  ///////////////////////
  // Share this on Google+
  window.___gcfg = {lang: 'en-GB'};

  (function() {
    var po = document.createElement('script'); po.type = 'text/javascript'; po.async = true;
    po.src = 'https://apis.google.com/js/plusone.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
  })();

  ///////////////////////
  // Share this on Facebook
  // <div id="fb-root"></div>
  // <script>(function(d, s, id) {
  //   var js, fjs = d.getElementsByTagName(s)[0];
  //   if (d.getElementById(id)) return;
  //   js = d.createElement(s); js.id = id;
  //   js.src = "//connect.facebook.net/en_US/all.js#xfbml=1&appId=618066764874981";
  //   fjs.parentNode.insertBefore(js, fjs);
  // }(document, 'script', 'facebook-jssdk'));</script>
};