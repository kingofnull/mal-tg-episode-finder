// ==UserScript==
// @name         Telegram new episode finder for MAL watching list page
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Find new unwatched episode from your disired Telegram channel/group/peer... and show a link to it in front of each anime on your MAL CURRENTLY WATCHING page.
// @author       KingOfNull
// @match        https://myanimelist.net/animelist/*?status=1
// @icon         https://www.google.com/s2/favicons?domain=myanimelist.net
// @grant        GM_addStyle
// @license MIT
/** this script use GramJs as browser based Telegram client and load it in below line: **/
// @require      https://cdn.jsdelivr.net/gh/kingofnull/gramjs-browser-build@69e9b471e30bb6da54577f911c953e1bf646b98b/gramjs.js

// ==/UserScript==





GM_addStyle(`
.new-ep{
 background: #a70000;
 padding: 5px 7px;
 border-radius: 7px;
 display:inline-block;
 padding:5px;
}

.list-table .list-table-data .data a.new-ep:hover {
    color: #a70000 !important;
    background: white;
}

`);


(async ()=> {
    'use strict';




    const {Api, TelegramClient} = gramjs;
    const { StringSession } = gramjs.sessions;

    //you can use mine or generate your own one
    const apiId = 1799740; // put your api id here [for example 123456789]
    const apiHash = "645175d3249752aa32bce7b4659cfd94"; // put your api hash here [for example '123456abcfghe']


    const session = localStorage.getItem('TgStrSession') ?? "";


    const client = new TelegramClient(new StringSession(session), apiId, apiHash, {
        connectionRetries: 3,
    });

    client.session.setDC(4, 'kws4.web.telegram.org', 443);//wss://kws4.web.telegram.org/apiws


    async function haveNewEp(name,ep,peerId){
        let nextEpStr=(ep*1+1).toString().padStart(2,'0');
        let searchTerm=`${name} ${nextEpStr}`;
        console.log("search for:",searchTerm);
        const result = await client.invoke(
            new Api.messages.Search({
                peer: peerId,
                q: searchTerm,
                filter: new                     Api.InputMessagesFilterDocument({}),
                limit:10,
            })
        );

        if(result.count<1){
            console.warn("not found");
            return null;
        }

        let message=result.messages.at(0);
        let fname=message.media.document.attributes.at().fileName;
        console.log(result.count,fname); // prints the result

        const linkResult = await client.invoke(
            new Api.channels.ExportMessageLink({
                channel: peerId,
                id: message.id,
                thread: true,
            })
        );
        let link=linkResult.link;
        console.log(link);
        return {link,fname};
    }



    //await client.connect();
    await client.start({
        phoneNumber: async () => prompt("Please enter your number: "),
        password: async () => prompt("Please enter your password: "),
        phoneCode: async () => prompt("Please enter the code you received: "),
        onError: (err) => console.log(err),
    });

    localStorage.setItem('TgStrSession',client.session.save());

    //find your peerId using @username_to_id_bot in telegram
    let peerId=localStorage.getItem("TgSearchPeerId");
    if(!peerId){
        peerId=prompt("Enter your search target peerId:");
        localStorage.setItem("TgSearchPeerId",peerId);
    }

    if(!!Number(peerId)){
        peerId=Number(peerId);
    }

    for(let r of $("td.title a.link").get()){
        let $r=$(r);
        let title=$r.text();
        let curEp=$r.parents("tr").find("td.progress a.link").text();
        console.log(title,":",curEp);
        let data=await haveNewEp(title,curEp,peerId);
        if(data){
            $("<a>",{href:data.link,class:'new-ep',target:"tgLinksWin"})
                .text("New Ep ! : "+data.fname)
                .appendTo($r.parents("td"));
        }

    }


    client.disconnect();

})();
