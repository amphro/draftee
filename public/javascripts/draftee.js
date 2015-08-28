$(function() {
  var position = 1,

      bidState = 'not started',
      bidTimer = null,

      timer = $('#timer'),
      bidButton = $('#bidPlayer'),
      buyButton = $('#buyPlayer'),
      submitTeamNamesButton = $('#submitTeamNames'),
      carousel = $('#playerPhotos'),
      selectWinnerModal = $('#selectWinnerModal'),
      enterTeamNamesModal = $('#enterTeamNamesModal'),
      resetDataButton = $('#resetData');

  var TEAM_NAMES_KEY = 'draftee:teamNames';
  var teamNames = JSON.parse(window.localStorage.getItem(TEAM_NAMES_KEY));
  if (teamNames) {
      initialize();
  } else {
      enterTeamNamesModal.modal('show');
  }

  var nflData, teams, transactions;

  submitTeamNamesButton.on('click', function() {
      teamNames = $('#teamNames').val().trim().split('\n');
      window.localStorage.setItem(TEAM_NAMES_KEY, JSON.stringify(teamNames));
      enterTeamNamesModal.modal('hide');
      initialize();
  });

  // Set some rando nfl thing as the starting images
  carousel.hide();
  bidButton.hide();

  resetDataButton.on('click', function() {
    draftTeams.resetDraftData();
    transactions.resetTransactions();
  });

  resetDataButton.on('dblclick', function() {
      if (window.confirm('Are you sure you want to reset ALL data? If you only want to clear transaction data, just press the Reset button once instead of double click.')) {
        draftTeams.resetDraftData();
        transactions.resetTransactions();
        window.localStorage.removeItem(TEAM_NAMES_KEY);
        window.localStorage.removeItem('draftee:teams');
        window.location.reload();
    }
  });

  function getResults(query) {
    return nflData.findDraftables(query).map(function (draftable) {
          return draftable.name;
        }).filter(function(name) {
          return !transactions.isDrafted(name);
        });
  }

  function nominateDraftable(draftableName) {
    var draftable = nflData.findDraftables(draftableName)[0];

    carousel.carousel('pause').hide().carousel(0);

    $('#playerName').text(draftable.name);

    if (draftable.abbrev) {
      $('#playerInfo').text('Defense');
    } else {
      var info = $('#playerInfo');
      var position = draftable.position;
      var playerNumber = draftable.number;
      var team = draftable.team;

      info.data('position', position);
      info.text(position + ' - #' + playerNumber + ' - ' + team);
    }

    bidButton.show();

    getDraftableImages(draftable, function(images) {
      $('#image1 img').attr('src', images[0]);
      $('#image2 img').attr('src', images[1]);
      $('#image3 img').attr('src', images[2]);

      carousel.show().carousel('cycle');
    });
  }

  function getDraftableImages(draftable, callback) {
    var draftableQuery;

    if (draftable.abbrev) {
      draftableQuery = draftable.name + ' Defense';
    } else {
      draftableQuery = draftable.name + ' ' + draftable.team;
    }

    getImages(draftableQuery, function(images) {
      callback(images);
    });
  }
  window.getDraftableImages = getDraftableImages;

  function getImages(query, callback) {
    $.ajax({
      url: "/images/?q=" + encodeURIComponent(query),
      dataType: 'json'
    })
    .done(function(data) {
        callback(data.images);
    });
  }

  function playTick() {
    var audio = document.getElementById('tick');
    audio.play();

    setTimeout(function() {
      audio.pause();
      audio.currentTime = 0;
    }, 700);
  }

  function playDone() {
    var audio = document.getElementById('done');
    audio.play();

    setTimeout(function() {
      audio.pause();
      audio.currentTime = 0;
    }, 1600);
  }

  function bidCountDown() {
    var time = parseInt(timer.text());

    if (time - 1 < 10) {
      timer.addClass('danger');

      (time - 1 == 0) ? playDone() : playTick();
    }

    if (time - 1 == 0) {
      clearInterval(bidTimer);

      bidState = 'done';
      bidButton.text('Select Winner');
    }

    timer.text(time - 1);
  }

  bidButton.click(function () {
    if (bidState === 'not started') {
      bidState = 'bidding';

      bidButton.text('Bidding')
      $('#timer').text('25');

      bidTimer = setInterval(bidCountDown, 1000);
    } else if (bidState === 'bidding') {
      var time = parseInt(timer.text());
      if (time < 10) {
        timer.text('10');
      }
    } else if (bidState === 'done') {
      selectWinnerModal.modal('show');
      bidState = 'not started';

      bidButton.text('Start Bidding');
      timer.text('25').removeClass('danger');
    }
  });

  buyButton.on('click', function() {
    bidButton.hide();

    var winningTeam = $('#winningTeam').val();
    var winningAmount = parseInt($('#winningAmount').val());

    if (winningTeam && winningAmount > 0) {
      var draftedPlayer = $('#playerName').text();
      var playerInfo = $('#playerInfo');
      teams.draft(draftedPlayer, playerInfo.data('position'), winningTeam, winningAmount);
      transactions.addTransaction(winningTeam, draftedPlayer, winningAmount);

      selectWinnerModal.modal('hide');
    }
  });

  function initialize() {
    nflData = window.nflData = new NFLData();
    teams = window.draftTeams = new Teams('#teamsBody', teamNames);
    transactions = window.transactions = new Transactions('#transBody');

    // No need for the enter teams modal anymore. It causes problems with the
    // bid modal so just remove it.
    enterTeamNamesModal.remove();

    nflData.loadData(function (count) {
      console.log('Loaded ' + count + ' NFL Player/Team Records');
    });

    $('#picker').typeahead({
      source: getResults,
      items: 8,
      minLength: 1,
      updater: nominateDraftable
    });

    $('#winningTeam').typeahead({
      source: teams.getNames(),
      items: 8,
      minLength: 1
    });
  }
});
