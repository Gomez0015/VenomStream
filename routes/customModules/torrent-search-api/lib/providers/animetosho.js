const TorrentProvider = require('torrent-search-api/lib/TorrentProvider');

class animetosho extends TorrentProvider {
    constructor() {
        super({
            name: 'animetosho',
            baseUrl: 'https://animetosho.org',
            enableCloudFareBypass: true,
            searchUrl: '',
            categories: {
                All: '',
                Movies: 'url:',
                TV: 'url:',
                Music: 'url:',
                Apps: 'url:',
                Books: 'url:',
                Top100: 'url:'
            },
            defaultCategory: 'All',
            resultsPerPageCount: 60,
            itemsSelector: '.home_list_entry',
            itemSelectors: {
                title: '.link a@text',
                size: '.size',
                desc: '.link a@href',
                magnet: 'a:contains(Magnet)@href'
            },
            paginateSelector: 'a:contains(»)@href',
        });
    }
}

module.exports = animetosho;