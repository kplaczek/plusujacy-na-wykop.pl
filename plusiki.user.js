// ==UserScript==
// @name        plusiki
// @namespace   http://github.com/kplaczek
// @include     http://www.wykop.pl/moj/*
// @include     http://www.wykop.pl/mikroblog/*
// @include     http://www.wykop.pl/ludzie/*
// @include     http://www.wykop.pl/wpis/*
// @include     http://www.wykop.pl/tag/*
// @include     http://www.wykop.pl/ustawienia/
// @version     1.2.1
// @description	formatuje plusuj?cych pod wpisami na mirko
// @downloadURL https://github.com/kplaczek/plusujacy-na-wykop.pl/raw/master/plusiki.user.js
// @updateURL   https://github.com/kplaczek/plusujacy-na-wykop.pl/raw/master/plusiki.user.js
// @grant       none
// ==/UserScript==

function main() {

    addStyle();

    var appkey = 'ZFlTRsQxPA';
    var elementy = [];
    var followers = [];
    var timer;
    $('body').on('click', '.toggleTrigger', function() {
        $(this).next('div').toggleClass('dnone');
    });

    resolveLocalStorageTexts();
    if (document.location.href.indexOf("http://www.wykop.pl/ustawienia") !== -1) {

        var settingsBox = generateSettingsBox('Skrypt plusów');

        var pPlural = $('<p />');
        pPlural.append($('<label />').addClass('fb_dig').text('Liczba mnoga:').css({'width': '150px', 'display': 'inline-block'}));
        pPlural.append($('<input />').addClass('plural xx-long c888 medium').val(localStorage.plural).attr({'type': 'text', 'mode': 'plural'}));

        var pSingular = $('<p />');
        pSingular.append($('<label />').addClass('fb_dig').text('Liczba pojedyncza:').css({'width': '150px', 'display': 'inline-block'}));
        pSingular.append($('<input />').addClass('singular xx-long c888 medium').val(localStorage.singular).attr({'type': 'text', 'mode': 'singular'}));

        settingsBox.find('.content').append(pPlural).append(pSingular);

        $('form.settings').find('fieldset:eq(8)').after(settingsBox);
        $('.plural, .singular').keyup(handleTextChange);
    }

    getFollowedUsers(1, true);
    $(document).ready(function() {
        elementy = $('.voters-list').has('a');
        $(window).scroll(function() {
            if (timer)
                clearTimeout(timer);
            timer = setTimeout(handleScroll, 200);
        });
        $(document).ajaxSuccess(function(e, xhr, settings) {


            //nastepna strona na mirko 
            if (settings.url.indexOf("http://www.wykop.pl/mikroblog/next/") !== -1)
            {

                //@TODO poprawiĂ¦ dodawanie nowych elementĂłw przy wczytywaniu stron
                elementy = $('.voters-list').has('a').not('.checkedAndDone');
            }
            //doÂładowanie komentarzy do wpisu
            if (settings.url.indexOf("http://www.wykop.pl/ajax2/wpis/comments/") !== -1)
            {
                var liId = /wpis\/comments\/(\d*)/img.exec(settings.url);
                var newElements = $('li div[data-id="' + liId[1] + '"]').parent().find('.voters-list').has('a');
                for (var i = 0, e = newElements.length; i < e; ++i) {
                    if ($(newElements[i]).has('a.showVoters').length > 0)
                    {
                        $($(newElements[i]).find('a.showVoters')[0]).click();
                    } else
                    {
                        formatVoters(newElements[i]);
                    }
                }
            }
            //odczytanie listy plusujÂących
            if (settings.url.indexOf("http://www.wykop.pl/ajax2/wpis/upvoters/") !== -1 ||
                    settings.url.indexOf("http://www.wykop.pl/ajax2/wpis/commentUpvoters/") !== -1
                    )//if (settings.url.indexOf("http://www.wykop.pl/ajax/entries/voters/item/") !== -1)
            {

                var liId = /upvoters\/(\d*)/img.exec(settings.url);
                var id = liId[1];

                var voteLiC = $('li div[data-id="' + id + '"]').find('.voters-list').first();
                formatVoters(voteLiC);
            }

            if (settings.url.indexOf("http://www.wykop.pl/ajax2/wpis/voteUp/") !== -1)
            {
                var liId = /voteUp\/(\d*)/img.exec(settings.url);
                var id = liId[1];
                var voteLiC = $('li div[data-id="' + id + '"]').find('.voters-list').first();

                if (voteLiC.find('.showVoters')) {
                    $(voteLiC.find('.showVoters')[0]).click();
                } else {
                    formatVoters(voteLiC);
                }
            }

            //zaplusowanie komentarza wpisu
            if (settings.url.indexOf("http://www.wykop.pl/ajax2/wpis/commentvoteUp/") !== -1)
            {
                var liId = /commentvoteUp\/(\d*)/img.exec(settings.url);
                var id = liId[1];
                var voteLiC = $('li div[data-id="' + id + '"]').find('.voters-list').first();

                if (voteLiC.find('.showVoters')) {
                    $(voteLiC.find('.showVoters')[0]).click();
                } else {
                    formatVoters(voteLiC);
                }
            }

            //usuniecie plusika komentarza do wpisu 
            if (settings.url.indexOf("http://www.wykop.pl/ajax2/wpis/commentvoteRemove/") !== -1)
            {
                var liId = /commentvoteRemove\/(\d*)/img.exec(settings.url);
                var id = liId[1];
                var voteLiC = $('li div[data-id="' + id + '"]').find('.voters-list').first();

                if (voteLiC.find('.showVoters')) {
                    $(voteLiC.find('.showVoters')[0]).click();
                } else {
                    formatVoters(voteLiC);
                }
            }


            if (settings.url.indexOf("http://www.wykop.pl/ajax2/wpis/voteRemove/") !== -1)
            {
                var liId = /voteRemove\/(\d*)/img.exec(settings.url);
                var id = liId[1];
                var voteLiC = $('li div[data-id="' + id + '"]').find('.voters-list').first();
                if (voteLiC.find('.showVoters')) {
                    $(voteLiC.find('.showVoters')[0]).click();
                } else {
                    formatVoters(voteLiC);
                }
            }
        });
    });

    function formatVoters(element)
    {
        followers = JSON.parse(localStorage.followed);
        var keepers = [];
        var nonames = [];
        $(element).find('a').each(function(i, e) {
            var nick = $.trim($(e).text());
            if (followers.indexOf(nick) === -1)
            {
                nonames.push(e);
                nonames.push(document.createTextNode("  "));
            } else {
                keepers.push(e);
                keepers.push(document.createTextNode("  "));
            }
        });

        $(element).html('+: ');
        $(element).append(keepers);

        if (nonames.length > 0)
        {
            if (keepers.length > 0)
                $(element).append(document.createTextNode('oraz '));
            $(element).append($('<span/>').addClass('toggleTrigger cpointer').text((nonames.length / 2) + " " + handleText(nonames.length / 2)));
            $(element).append($('<div/>').addClass('dnone').append(nonames));
            $(element).addClass('checkedAndDone');
        }
    }

    function handleText(number)
    {
        return (number > 1) ? localStorage.plural : localStorage.singular;
    }

    function getOwnUsername()
    {
        return $('img.avatar').attr('alt');
    }

    function generateSettingsBox(title)
    {
        var settingsBox = $('<div />');
        settingsBox.addClass('fblock margin10_0 marginbott20');
        var fieldset = $('<fieldset />').addClass('bgf6f6f6 pding5');

        var h3 = $('<h4 />').text(title);
        var fleft = $('<div />').addClass('fleft content');

        settingsBox.append(fieldset.append(h3).append(fleft));
        return settingsBox;
    }

    function getFollowedUsers(page, force)
    {
        $.ajax({
            url: "http://a.wykop.pl/profile/index/" + getOwnUsername() + "/appkey/" + appkey + ",format,json",
            dataType: 'json'
        }).done(function(data) {
            following = data.following;
            var pages = Math.ceil(data.following / 25);

            if (localStorage.followed === undefined || JSON.parse(localStorage.followed).length !== following + 1) {
                for (var i = 1; i <= pages; i++) {
                    followers = [getOwnUsername()];
                    $.ajax({
                        url: "http://a.wykop.pl/profile/Followed/" + getOwnUsername() + "/appkey/" + appkey + ",format,json,page," + i,
                        dataType: 'json'
                    }).done(function(data) {
                        for (var user in data) {
                            followers.push(data[user].login);
                        }
                        if (followers.length === following + 1) {
                            localStorage.followed = JSON.stringify(followers);
                        }
                    });
                }
            }
        });
    }

    function handleScroll()
    {
        var windowHeight = $(window).height();
        var windowScrollTop = $(window).scrollTop();
        for (var i = 0, e = elementy.length - 1; i < e; i++)
        {
            var elementOffsetTop = $(elementy[i]).offset().top;
            if (elementOffsetTop > windowScrollTop && elementOffsetTop < windowScrollTop + windowHeight + 400)
            {
                if ($(elementy[i]).find('a.showVoters').length === 1)
                {
                    $($(elementy[i]).find('a.showVoters')[0]).click();
                    elementy.splice(i, 1);
                } else
                {
                    formatVoters(elementy[i]);
                    elementy.splice(i, 1);
                }
            }
        }
    }

    function resolveLocalStorageTexts()
    {
        if (localStorage.plural === undefined)
            localStorage.plural = "noname'ów";
        if (localStorage.singular === undefined)
            localStorage.singular = "noname";
    }

    function handleTextChange(e, x)
    {
        localStorage[$(e.target).attr('mode')] = $(e.target).val();
    }
    
    function addStyle() {
        var style = document.createElement('style');
        style.textContent = '.voters-list .color-0 {color: #339933 !important;}.voters-list .color-1 {color: #ff5917 !important;}.voters-list .color-2 {color: #bb0000 !important;}.voters-list .color-3 {color: #ff0000 !important;}.voters-list .color-4 {color: #999999 !important;}.voters-list .color-5 {color: #000000 !important;}.voters-list .color-6 {color: #367aa9 !important;}.voters-list .color-1001 {color: #999999 !important;}.voters-list .color-1002 {color: #999999 !important;}.voters-list .color-2001 {color: #3f6fa0 !important;}';
        document.body.appendChild(style);
    }
    
}

if (typeof $ === 'undefined') {
    if (typeof unsafeWindow !== 'undefined' && unsafeWindow.jQuery) {
        // Firefox
        var $ = unsafeWindow.jQuery;
        main();
    } else {
        // Chrome
        addJQuery(main);
    }
} else {
    // Opera >.>
    main();
}
function addJQuery(callback) {
    var script = document.createElement("script");
    script.textContent = "(" + callback.toString() + ")();";
    document.body.appendChild(script);
}
