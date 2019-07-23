const request = require('request-promise')
const regularRequest = require('request')
const fs = require('fs')
const cheerio = require('cheerio')
const Nightmare = require('nightmare')
const nightmare = Nightmare({
    show: true
})

const sampleResult = {
    title: "The Lion King",
    rank: 1,
    imdbRating: 7.2,
    descriptionUrl: 'https://www.imdb.com/title/tt6105098/?pf_rd_m=A2FGELUUNOQJNL&pf_rd_p=ea4e08e1-c8a3-47b5-ac3a-75026647c16e&pf_rd_r=E9DAPJVFMMWJAQ68SJGX&pf_rd_s=center-1&pf_rd_t=15506&pf_rd_i=moviemeter&ref_=chtmvm_tt_1',
    posterUrl: 'https://www.imdb.com/title/tt6105098/mediaviewer/rm2458872832',
    posterImageUrl: 'https://m.media-amazon.com/images/M/MV5BMjIwMjE1Nzc4NV5BMl5BanBnXkFtZTgwNDg4OTA1NzM@._V1_SY1000_CR0,0,674,1000_AL_.jpg'
}

async function scrapeTitlesRanksAndRatings() {
    const result = await request.get('https://www.imdb.com/chart/moviemeter?ref_=nv_mv_mpm')
    const $ = await cheerio.load(result)

    const movies = $('tr').map((index, element) => {
            const title = $(element)
                .find('td.titleColumn > a')
                .text()
            const descriptionUrl = 'https://www.imdb.com' +
                $(element)
                .find('td.titleColumn > a')
                .attr('href')
            const imdbRating = $(element)
                .find('td.ratingColumn.imdbRating')
                .text()
                .trim()

            return {
                title,
                imdbRating,
                rank: index,
                descriptionUrl
            }
        })
        .get()
    return movies
}

async function scrapeWithPosterUrl(movies) {
    const moviesWithPosterUrls = await Promise.all(

        movies.map(async movie => {
            try {
                const html = await request.get(movie.descriptionUrl)
                const $ = await cheerio.load(html)
                movie.posterUrl = 'https://www.imdb.com' +
                    $('div.poster > a').attr('href')
                return movie
            } catch (err) {
                // console.log(err)
            }
        })
    )
    return moviesWithPosterUrls
}

async function main() {
    let movies = await scrapeTitlesRanksAndRatings()
    movies = await scrapeWithPosterUrl(movies)
    movies = await scrapePosterImageUrl(movies)
    console.log(movies)
}

async function scrapePosterImageUrl(movies) {
    for (var i = 0; i < movies.length; i++) {
        try {
            const posterImageUrl = await nightmare
                .goto(movies[i].posterUrl)
                .evaluate(() =>
                    $('#photo-container > div > div:nth-child(3) > div > div.pswp__scroll-wrap > div.pswp__container > div:nth-child(2) > div > img:nth-child(2)')
                    .attr('src')
                )
            movies[i].posterImageUrl = posterImageUrl
            savePosterImageToDisk(movies[i])
            console.log(movies[i])
        } catch (err) {
            console.log(err)
        }
    }
    return movies
}

async function savePosterImageToDisk(movie) {
    regularRequest
        .get(movie.posterImageUrl)
        .pipe(fs.createWriteStream(`posters/${movie.rank}.png`))
}

main()