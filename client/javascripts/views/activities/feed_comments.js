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