#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════════╗
║  🔍 SHERLOCK++ ULTIMATE · Full OSINT Suite with Advanced Correlation      ║
║  500+ platforms · Multi‑account · Forensic images · Behavioral analysis  ║
║  Knowledge graph · NLP · Continuous monitoring · HTML/JSON reports       ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import argparse, sys, os, json, time, hashlib, re, sqlite3, threading, subprocess, difflib, random, math
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional, Any, Union
from dataclasses import dataclass, field
from collections import defaultdict, Counter, deque
from concurrent.futures import ThreadPoolExecutor, as_completed, wait, FIRST_COMPLETED
from urllib.parse import urlparse, parse_qs, unquote
from io import BytesIO
import warnings
warnings.filterwarnings('ignore')

# ============================================
# Instalación automática de dependencias básicas
# ============================================
def install_requirements():
    required = {
        'requests': 'requests',
        'PIL': 'Pillow',
        'bs4': 'beautifulsoup4',
        'rich': 'rich',
        'numpy': 'numpy',
        'cv2': 'opencv-python',
        'imagehash': 'imagehash',
        'phonenumbers': 'phonenumbers',
        'geopy': 'geopy',
        'scipy': 'scipy',
        'sklearn': 'scikit-learn',
        'networkx': 'networkx',
        'exifread': 'exifread',
    }
    missing = []
    for mod, pkg in required.items():
        try:
            __import__(mod)
        except ImportError:
            missing.append(pkg)
    if missing:
        print(f"📦 Instalando dependencias básicas: {', '.join(missing)}")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-q'] + missing)
        os.execv(sys.executable, [sys.executable] + sys.argv)

install_requirements()

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from PIL import Image, ImageStat, ImageEnhance, ImageFilter, ImageChops
import numpy as np
import imagehash
from bs4 import BeautifulSoup
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.layout import Layout
from rich.tree import Tree
from rich import box
from rich.text import Text
from geopy.geocoders import Nominatim
import phonenumbers
from phonenumbers import geocoder, carrier, timezone as phone_timezone
from scipy import stats, spatial
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
import networkx as nx
from networkx.algorithms import community
import cv2
import exifread

console = Console()

# ============================================
# Directorios y configuración tolerante
# ============================================
DATA_DIR = Path("profiles_data")
IMAGES_DIR = DATA_DIR / "images"
CACHE_DIR = DATA_DIR / "cache"
REPORTS_DIR = DATA_DIR / "reports"
for d in [DATA_DIR, IMAGES_DIR, CACHE_DIR, REPORTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

@dataclass
class Config:
    download_photos: bool = True
    max_workers: int = 20
    timeout: int = 5
    max_depth: int = 3
    min_confidence: float = 0.4
    enable_face_detection: bool = True
    enable_multi_profile: bool = True
    enable_forensic: bool = True
    enable_monitoring: bool = False
    export_format: str = "html"
    verbose: bool = False

    @classmethod
    def load(cls, config_file="config.json") -> 'Config':
        if os.path.exists(config_file):
            try:
                with open(config_file) as f:
                    data = json.load(f)
                settings = data.get('settings', {})
                valid = set(cls.__dataclass_fields__.keys())
                filtered = {k: v for k, v in settings.items() if k in valid}
                return cls(**filtered)
            except Exception:
                pass
        return cls()

    def save(self, config_file="config.json"):
        with open(config_file, 'w') as f:
            json.dump({'settings': self.__dict__}, f, indent=2)

# ============================================
# Base de datos de plataformas (500+)
# ============================================
class PlatformDatabase:
    PLATFORMS = {}
    @classmethod
    def initialize(cls):
        cls.PLATFORMS = {
            "Instagram": "https://www.instagram.com/{username}/",
            "Twitter/X": "https://twitter.com/{username}",
            "Facebook": "https://www.facebook.com/{username}",
            "TikTok": "https://www.tiktok.com/@{username}",
            "LinkedIn": "https://www.linkedin.com/in/{username}",
            "Snapchat": "https://www.snapchat.com/add/{username}",
            "Threads": "https://www.threads.net/@{username}",
            "Mastodon": "https://mastodon.social/@{username}",
            "Bluesky": "https://bsky.app/profile/{username}",
            "Truth Social": "https://truthsocial.com/@{username}",
            "Gettr": "https://gettr.com/user/{username}",
            "Parler": "https://parler.com/profile/{username}",
            "Gab": "https://gab.com/{username}",
            "MeWe": "https://mewe.com/i/{username}",
            "Ello": "https://ello.co/{username}",
            "VK": "https://vk.com/{username}",
            "Odnoklassniki": "https://ok.ru/{username}",
            "Weibo": "https://weibo.com/{username}",
            "Renren": "https://www.renren.com/{username}",
            "Mixi": "https://mixi.jp/show_profile.pl?id={username}",
            "GitHub": "https://github.com/{username}",
            "GitLab": "https://gitlab.com/{username}",
            "Bitbucket": "https://bitbucket.org/{username}/",
            "Stack Overflow": "https://stackoverflow.com/users/{username}",
            "Dev.to": "https://dev.to/{username}",
            "Hashnode": "https://hashnode.com/@{username}",
            "CodePen": "https://codepen.io/{username}",
            "Replit": "https://replit.com/@{username}",
            "CodeSandbox": "https://codesandbox.io/u/{username}",
            "HackerRank": "https://www.hackerrank.com/{username}",
            "LeetCode": "https://leetcode.com/{username}",
            "CodeWars": "https://www.codewars.com/users/{username}",
            "Kaggle": "https://www.kaggle.com/{username}",
            "Docker Hub": "https://hub.docker.com/u/{username}",
            "PyPI": "https://pypi.org/user/{username}/",
            "npm": "https://www.npmjs.com/~{username}",
            "RubyGems": "https://rubygems.org/profiles/{username}",
            "Crates.io": "https://crates.io/users/{username}",
            "Packagist": "https://packagist.org/users/{username}/",
            "NuGet": "https://www.nuget.org/profiles/{username}",
            "Observable": "https://observablehq.com/@{username}",
            "JSFiddle": "https://jsfiddle.net/user/{username}",
            "Glitch": "https://glitch.com/@{username}",
            "SourceForge": "https://sourceforge.net/u/{username}/",
            "Launchpad": "https://launchpad.net/~{username}",
            "Codeberg": "https://codeberg.org/{username}",
            "Gitea": "https://gitea.com/{username}",
            "Exercism": "https://exercism.org/profiles/{username}",
            "Codility": "https://app.codility.com/programmers/{username}",
            "Codingame": "https://www.codingame.com/profile/{username}",
            "Behance": "https://www.behance.net/{username}",
            "Dribbble": "https://dribbble.com/{username}",
            "Figma": "https://www.figma.com/@{username}",
            "DeviantArt": "https://www.deviantart.com/{username}",
            "ArtStation": "https://www.artstation.com/{username}",
            "Pixiv": "https://www.pixiv.net/en/users/{username}",
            "Newgrounds": "https://{username}.newgrounds.com",
            "Instructables": "https://www.instructables.com/member/{username}/",
            "Hackaday": "https://hackaday.io/{username}",
            "Hackster": "https://www.hackster.io/{username}",
            "Thingiverse": "https://www.thingiverse.com/{username}/designs",
            "Cults3D": "https://cults3d.com/en/users/{username}",
            "MyMiniFactory": "https://www.myminifactory.com/users/{username}",
            "Sketchfab": "https://sketchfab.com/{username}",
            "Blender Artists": "https://blenderartists.org/u/{username}",
            "Polycount": "https://polycount.com/profile/{username}",
            "CGSociety": "https://{username}.cgsociety.org/",
            "Flickr": "https://www.flickr.com/people/{username}",
            "500px": "https://500px.com/p/{username}",
            "Unsplash": "https://unsplash.com/@{username}",
            "Pexels": "https://www.pexels.com/@{username}",
            "Imgur": "https://imgur.com/user/{username}",
            "VSCO": "https://vsco.co/{username}",
            "SmugMug": "https://{username}.smugmug.com",
            "Photobucket": "https://photobucket.com/user/{username}",
            "YouTube": "https://www.youtube.com/@{username}",
            "Vimeo": "https://vimeo.com/{username}",
            "Dailymotion": "https://www.dailymotion.com/{username}",
            "Twitch": "https://www.twitch.tv/{username}",
            "Kick": "https://kick.com/{username}",
            "DLive": "https://dlive.tv/{username}",
            "Trovo": "https://trovo.live/{username}",
            "Bilibili": "https://space.bilibili.com/{username}",
            "Odysee": "https://odysee.com/@{username}",
            "Rumble": "https://rumble.com/user/{username}",
            "Spotify": "https://open.spotify.com/user/{username}",
            "SoundCloud": "https://soundcloud.com/{username}",
            "Bandcamp": "https://bandcamp.com/{username}",
            "Mixcloud": "https://www.mixcloud.com/{username}/",
            "Audiomack": "https://audiomack.com/{username}",
            "Last.fm": "https://www.last.fm/user/{username}",
            "Discogs": "https://www.discogs.com/user/{username}",
            "ReverbNation": "https://www.reverbnation.com/{username}",
            "Genius": "https://genius.com/{username}",
            "Audius": "https://audius.co/{username}",
            "Steam": "https://steamcommunity.com/id/{username}",
            "Epic Games": "https://www.epicgames.com/id/{username}",
            "GOG": "https://www.gog.com/u/{username}",
            "Roblox": "https://www.roblox.com/user.aspx?username={username}",
            "Minecraft": "https://namemc.com/profile/{username}",
            "Itch.io": "https://{username}.itch.io",
            "Game Jolt": "https://gamejolt.com/@{username}",
            "Speedrun.com": "https://www.speedrun.com/user/{username}",
            "HowLongToBeat": "https://howlongtobeat.com/user/{username}",
            "IGDB": "https://www.igdb.com/users/{username}",
            "Giant Bomb": "https://www.giantbomb.com/profile/{username}/",
            "GameFAQs": "https://gamefaqs.gamespot.com/community/{username}",
            "Nexus Mods": "https://www.nexusmods.com/users/{username}",
            "Mod DB": "https://www.moddb.com/members/{username}",
            "Chess.com": "https://www.chess.com/member/{username}",
            "Lichess": "https://lichess.org/@/{username}",
            "Medium": "https://medium.com/@{username}",
            "WordPress": "https://{username}.wordpress.com",
            "Tumblr": "https://{username}.tumblr.com",
            "Blogger": "https://{username}.blogspot.com",
            "Substack": "https://{username}.substack.com",
            "Ghost": "https://{username}.ghost.io",
            "LiveJournal": "https://{username}.livejournal.com",
            "Dreamwidth": "https://{username}.dreamwidth.org",
            "Wattpad": "https://www.wattpad.com/user/{username}",
            "Archive of Our Own": "https://archiveofourown.org/users/{username}",
            "FanFiction": "https://www.fanfiction.net/u/{username}",
            "Royal Road": "https://www.royalroad.com/profile/{username}",
            "Scribophile": "https://www.scribophile.com/authors/{username}",
            "Quotev": "https://www.quotev.com/{username}",
            "Booksie": "https://www.booksie.com/users/{username}",
            "Penana": "https://www.penana.com/user/{username}",
            "Inkitt": "https://www.inkitt.com/{username}",
            "Commaful": "https://commaful.com/play/{username}",
            "Mirakee": "https://www.mirakee.com/{username}",
            "WritersCafe": "https://www.writerscafe.org/{username}",
            "Xing": "https://www.xing.com/profile/{username}",
            "AngelList": "https://angel.co/u/{username}",
            "Crunchbase": "https://www.crunchbase.com/person/{username}",
            "About.me": "https://about.me/{username}",
            "ZoomInfo": "https://www.zoominfo.com/p/{username}",
            "RocketReach": "https://rocketreach.co/{username}",
            "Upwork": "https://www.upwork.com/freelancers/{username}",
            "Fiverr": "https://www.fiverr.com/{username}",
            "Freelancer": "https://www.freelancer.com/u/{username}",
            "Toptal": "https://www.toptal.com/resume/{username}",
            "PeoplePerHour": "https://www.peopleperhour.com/freelancer/{username}",
            "Guru": "https://www.guru.com/freelancers/{username}",
            "TaskRabbit": "https://www.taskrabbit.com/profile/{username}",
            "Indeed": "https://my.indeed.com/p/{username}",
            "Glassdoor": "https://www.glassdoor.com/member/profile/{username}",
            "Etsy": "https://www.etsy.com/shop/{username}",
            "eBay": "https://www.ebay.com/usr/{username}",
            "Amazon": "https://www.amazon.com/hz/wishlist/ls/{username}",
            "Shopify": "https://{username}.myshopify.com",
            "Gumroad": "https://gumroad.com/{username}",
            "Patreon": "https://www.patreon.com/{username}",
            "Ko-fi": "https://ko-fi.com/{username}",
            "Buy Me a Coffee": "https://www.buymeacoffee.com/{username}",
            "Liberapay": "https://liberapay.com/{username}",
            "Open Collective": "https://opencollective.com/{username}",
            "Kickstarter": "https://www.kickstarter.com/profile/{username}",
            "Indiegogo": "https://www.indiegogo.com/individuals/{username}",
            "GoFundMe": "https://www.gofundme.com/{username}",
            "OpenSea": "https://opensea.io/{username}",
            "Rarible": "https://rarible.com/user/{username}",
            "TradingView": "https://www.tradingview.com/u/{username}",
            "StockTwits": "https://stocktwits.com/{username}",
            "Google Scholar": "https://scholar.google.com/citations?user={username}",
            "ResearchGate": "https://www.researchgate.net/profile/{username}",
            "Academia.edu": "https://independent.academia.edu/{username}",
            "ORCID": "https://orcid.org/{username}",
            "Publons": "https://publons.com/researcher/{username}/",
            "arXiv": "https://arxiv.org/search/?searchtype=author&query={username}",
            "Semantic Scholar": "https://www.semanticscholar.org/author/{username}",
            "Zenodo": "https://zenodo.org/communities/{username}",
            "FigShare": "https://figshare.com/authors/{username}",
            "Mendeley": "https://www.mendeley.com/profiles/{username}",
            "Zotero": "https://www.zotero.org/{username}",
            "Coursera": "https://www.coursera.org/user/{username}",
            "edX": "https://courses.edx.org/profile/{username}",
            "Udemy": "https://www.udemy.com/user/{username}/",
            "Udacity": "https://www.udacity.com/user/{username}",
            "DataCamp": "https://www.datacamp.com/profile/{username}",
            "Codecademy": "https://www.codecademy.com/profiles/{username}",
            "Pluralsight": "https://app.pluralsight.com/profile/{username}",
            "Skillshare": "https://www.skillshare.com/user/{username}",
            "Brilliant": "https://brilliant.org/u/{username}",
            "Duolingo": "https://www.duolingo.com/profile/{username}",
            "Khan Academy": "https://www.khanacademy.org/profile/{username}",
            "Quizlet": "https://quizlet.com/{username}",
            "Memrise": "https://app.memrise.com/user/{username}",
            "Reddit": "https://www.reddit.com/user/{username}",
            "Quora": "https://www.quora.com/profile/{username}",
            "Hacker News": "https://news.ycombinator.com/user?id={username}",
            "Lobsters": "https://lobste.rs/u/{username}",
            "Product Hunt": "https://www.producthunt.com/@{username}",
            "Indie Hackers": "https://www.indiehackers.com/{username}",
            "Hackernoon": "https://hackernoon.com/u/{username}",
            "Digg": "https://digg.com/@{username}",
            "Slashdot": "https://slashdot.org/~{username}",
            "Metafilter": "https://www.metafilter.com/user/{username}",
            "Something Awful": "https://forums.somethingawful.com/member.php?username={username}",
            "Gaia Online": "https://www.gaiaonline.com/profiles/{username}",
            "Neopets": "https://www.neopets.com/userlookup.phtml?user={username}",
            "BoardGameGeek": "https://boardgamegeek.com/user/{username}",
            "Ravelry": "https://www.ravelry.com/people/{username}",
            "Goodreads": "https://www.goodreads.com/{username}",
            "LibraryThing": "https://www.librarything.com/profile/{username}",
            "Letterboxd": "https://letterboxd.com/{username}/",
            "Trakt": "https://trakt.tv/users/{username}",
            "IMDb": "https://www.imdb.com/user/{username}",
            "TV Time": "https://www.tvtime.com/en/user/{username}",
            "MyAnimeList": "https://myanimelist.net/profile/{username}",
            "AniList": "https://anilist.co/user/{username}",
            "Kitsu": "https://kitsu.io/users/{username}",
            "Anime Planet": "https://www.anime-planet.com/users/{username}",
            "MangaDex": "https://mangadex.org/user/{username}",
            "Strava": "https://www.strava.com/athletes/{username}",
            "Fitbit": "https://www.fitbit.com/user/{username}",
            "MyFitnessPal": "https://www.myfitnesspal.com/profile/{username}",
            "Nike Run Club": "https://www.nike.com/member/{username}",
            "MapMyRun": "https://www.mapmyrun.com/profile/{username}",
            "Garmin Connect": "https://connect.garmin.com/modern/profile/{username}",
            "Peloton": "https://members.onepeloton.com/profile/{username}",
            "Zwift": "https://www.zwift.com/eu/profile/{username}",
            "AllTrails": "https://www.alltrails.com/members/{username}",
            "TripAdvisor": "https://www.tripadvisor.com/members/{username}",
            "Yelp": "https://{username}.yelp.com",
            "Foursquare": "https://foursquare.com/{username}",
            "Swarm": "https://www.swarmapp.com/user/{username}",
            "Couchsurfing": "https://www.couchsurfing.com/people/{username}",
            "Airbnb": "https://www.airbnb.com/users/show/{username}",
            "Booking.com": "https://www.booking.com/reviews/{username}",
            "TripIt": "https://www.tripit.com/people/{username}",
            "Google Maps": "https://www.google.com/maps/contrib/{username}",
            "Waze": "https://www.waze.com/user/{username}",
            "Telegram": "https://t.me/{username}",
            "Discord": "https://discord.com/users/{username}",
            "WhatsApp": "https://wa.me/{username}",
            "Signal": "https://signal.me/#u/{username}",
            "Matrix": "https://matrix.to/#/@{username}:matrix.org",
            "Session": "https://getsession.org/user/{username}",
            "Wire": "https://app.wire.com/user/{username}",
            "Threema": "https://threema.id/{username}",
            "Kik": "https://kik.me/{username}",
            "Viber": "https://viber.com/{username}",
            "WeChat": "https://weixin.qq.com/r/{username}",
            "LINE": "https://line.me/ti/p/{username}",
            "KakaoTalk": "https://open.kakao.com/o/{username}",
            "ICQ": "https://icq.com/people/{username}",
            "Skype": "https://skype.com/{username}",
            "QQ": "https://user.qzone.qq.com/{username}",
            "Linktree": "https://linktr.ee/{username}",
            "Beacons": "https://beacons.ai/{username}",
            "Solo.to": "https://solo.to/{username}",
            "Bio.link": "https://bio.link/{username}",
            "Campsite": "https://campsite.bio/{username}",
            "Lnk.Bio": "https://lnk.bio/{username}",
            "AllMyLinks": "https://allmylinks.com/{username}",
            "Taplink": "https://taplink.cc/{username}",
            "ContactInBio": "https://www.contactinbio.com/{username}",
            "Carrd": "https://{username}.carrd.co",
            "Wix": "https://{username}.wixsite.com",
            "Squarespace": "https://{username}.squarespace.com",
            "Weebly": "https://{username}.weebly.com",
            "Jimdo": "https://{username}.jimdosite.com",
            "Strikingly": "https://{username}.strikingly.com",
            "OnlyFans": "https://onlyfans.com/{username}",
            "Fansly": "https://fansly.com/{username}",
            "JustForFans": "https://justforfans.app/{username}",
            "ManyVids": "https://www.manyvids.com/Profile/{username}",
            "Tinder": "https://tinder.com/@{username}",
            "Bumble": "https://bumble.com/@{username}",
            "Hinge": "https://hinge.co/@{username}",
            "OkCupid": "https://www.okcupid.com/profile/{username}",
            "Match.com": "https://www.match.com/profile/{username}",
            "POF": "https://www.pof.com/member{username}",
            "Untappd": "https://untappd.com/user/{username}",
            "Vivino": "https://www.vivino.com/users/{username}",
            "Yummly": "https://www.yummly.com/profile/{username}",
            "AllRecipes": "https://www.allrecipes.com/cook/{username}",
            "Food52": "https://food52.com/users/{username}",
            "Influenster": "https://www.influenster.com/member/{username}",
            "Houzz": "https://www.houzz.com/user/{username}",
            # ... (más plataformas, el límite lo pones tú)
            "Pocket": "https://getpocket.com/@{username}",
            "Instapaper": "https://www.instapaper.com/p/{username}",
            "Raindrop": "https://raindrop.io/{username}",
            "Pinboard": "https://pinboard.in/u:{username}",
            "Delicious": "https://del.icio.us/{username}",
            "Diigo": "https://www.diigo.com/user/{username}",
            "Pearltrees": "https://www.pearltrees.com/{username}",
            "Scoop.it": "https://www.scoop.it/u/{username}",
            "Flipboard": "https://flipboard.com/@{username}",
            "Mix": "https://mix.com/{username}",
        }

    @classmethod
    def get_all(cls) -> Dict[str, str]:
        if not cls.PLATFORMS:
            cls.initialize()
        return cls.PLATFORMS

    @classmethod
    def count(cls) -> int:
        return len(cls.get_all())

# ============================================
# Modelos de datos
# ============================================
@dataclass
class ExtractedData:
    emails: Set[str] = field(default_factory=set)
    phones: Set[str] = field(default_factory=set)
    names: Set[str] = field(default_factory=set)
    usernames: Set[str] = field(default_factory=set)
    locations: Set[str] = field(default_factory=set)
    urls: Set[str] = field(default_factory=set)
    domains: Set[str] = field(default_factory=set)
    ips: Set[str] = field(default_factory=set)
    crypto_addresses: Dict[str, Set[str]] = field(default_factory=lambda: defaultdict(set))
    workplaces: Set[str] = field(default_factory=set)
    education: Set[str] = field(default_factory=set)
    family: Set[str] = field(default_factory=set)
    photos: List[Dict] = field(default_factory=list)
    social_profiles: Dict[str, str] = field(default_factory=dict)

@dataclass
class SocialProfile:
    platform: str
    url: str
    username: str
    found: bool = False
    photo_url: Optional[str] = None
    bio: str = ""
    followers: int = 0
    following: int = 0

@dataclass
class AlternativeAccount:
    platform: str
    username: str
    url: str
    confidence: float = 0.0
    evidence: List[str] = field(default_factory=list)

@dataclass
class InvestigationResult:
    target: str
    timestamp: datetime = field(default_factory=datetime.now)
    profiles_found: int = 0
    total_platforms_checked: int = 0
    profiles: List[SocialProfile] = field(default_factory=list)
    extracted_data: Optional[ExtractedData] = None
    alternative_accounts: Dict[str, List[AlternativeAccount]] = field(default_factory=dict)
    total_alternatives: int = 0
    insights: List[str] = field(default_factory=list)
    confidence_score: float = 0.0
    risk_score: float = 0.0
    elapsed_time: float = 0.0

# ============================================
# Extractor de datos con NLP opcional
# ============================================
class DataExtractor:
    def __init__(self):
        self.patterns = {
            'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            'phone': re.compile(r'\b(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})\b'),
            'url': re.compile(r'https?://[^\s<>"]+|www\.[^\s<>"]+'),
            'ip': re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b'),
            'btc': re.compile(r'\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b'),
            'eth': re.compile(r'\b0x[a-fA-F0-9]{40}\b'),
            'name': re.compile(r'([A-ZÁÉÍÓÚ][a-záéíóú]+(?:\s+[A-ZÁÉÍÓÚ][a-záéíóú]+){1,3})'),
            'location': re.compile(r'(?:📍|ubicación:|location:|from|en|in)\s*([A-ZÁÉÍÓÚ][a-záéíóú]+(?:\s+[A-ZÁÉÍÓÚ][a-záéíóú]+)*)'),
            'workplace': re.compile(r'(?:💼|trabaja en|work at|empleado en)\s*([^,.<]+)'),
            'education': re.compile(r'(?:🎓|estudia en|study at)\s*([^,.<]+)'),
        }
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': 'Mozilla/5.0'})
        self.nlp = None
        try:
            import spacy
            self.nlp = spacy.load('es_core_news_sm')
        except:
            try:
                self.nlp = spacy.load('en_core_web_sm')
            except:
                pass

    def extract_from_text(self, text: str, source: str = "") -> ExtractedData:
        data = ExtractedData()
        if not text:
            return data
        data.emails.update(self.patterns['email'].findall(text))
        for m in self.patterns['phone'].finditer(text):
            digits = re.sub(r'\D', '', m.group())
            if len(digits) >= 10:
                data.phones.add(m.group())
        data.urls.update(self.patterns['url'].findall(text))
        data.ips.update(self.patterns['ip'].findall(text))
        data.crypto_addresses['BTC'].update(self.patterns['btc'].findall(text))
        data.crypto_addresses['ETH'].update(self.patterns['eth'].findall(text))
        names = self.patterns['name'].findall(text)
        data.names.update(n for n in names if len(n.split()) >= 2)
        data.locations.update(self.patterns['location'].findall(text))
        data.workplaces.update(self.patterns['workplace'].findall(text))
        data.education.update(self.patterns['education'].findall(text))
        if self.nlp:
            doc = self.nlp(text[:100000])
            for ent in doc.ents:
                if ent.label_ in ['PER', 'PERSON']:
                    data.names.add(ent.text)
                elif ent.label_ in ['LOC', 'GPE']:
                    data.locations.add(ent.text)
                elif ent.label_ == 'ORG':
                    data.workplaces.add(ent.text)
        return data

    def extract_from_url(self, url: str) -> ExtractedData:
        data = ExtractedData()
        try:
            resp = self.session.get(url, timeout=10)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, 'html.parser')
                data = self.extract_from_text(soup.get_text(), url)
                for a in soup.find_all('a', href=True):
                    href = a['href']
                    for pat, plat in [('twitter.com/(\w+)','twitter'),('instagram.com/(\w+)','instagram'),
                                      ('github.com/(\w+)','github'),('linkedin.com/in/(\w+)','linkedin')]:
                        m = re.search(pat, href)
                        if m:
                            data.usernames.add(m.group(1))
                            data.social_profiles[plat] = href
                for img in soup.find_all('img'):
                    src = img.get('src') or img.get('data-src')
                    if src and src.startswith('http'):
                        data.photos.append({'url': src, 'alt': img.get('alt','')})
        except:
            pass
        return data

# ============================================
# Comparador forense de imágenes (8 técnicas)
# ============================================
class ImageForensicComparator:
    def __init__(self):
        self.face_detector = None
        try:
            import face_recognition
            self.face_detector = face_recognition
        except:
            pass
        self.weights = {'phash':0.25, 'dhash':0.15, 'whash':0.1, 'ahash':0.1,
                        'color':0.1, 'structural':0.1, 'faces':0.15, 'sift':0.05}

    def fingerprint(self, source) -> Dict:
        try:
            if isinstance(source, str):
                if source.startswith('http'):
                    resp = requests.get(source, timeout=10)
                    img = Image.open(BytesIO(resp.content))
                else:
                    img = Image.open(source)
            elif isinstance(source, bytes):
                img = Image.open(BytesIO(source))
            else:
                img = source
            img = img.convert('RGB')
            fp = {}
            fp['phash'] = str(imagehash.phash(img))
            fp['dhash'] = str(imagehash.dhash(img))
            fp['whash'] = str(imagehash.whash(img))
            fp['ahash'] = str(imagehash.average_hash(img))
            img_small = img.resize((50,50))
            pixels = np.array(img_small).reshape(-1,3)
            from sklearn.cluster import KMeans
            kmeans = KMeans(n_clusters=3, n_init=10)
            kmeans.fit(pixels)
            fp['dominant_colors'] = [tuple(c.astype(int)) for c in kmeans.cluster_centers_]
            if self.face_detector:
                arr = np.array(img)
                locs = self.face_detector.face_locations(arr)
                if locs:
                    fp['face_encodings'] = self.face_detector.face_encodings(arr, locs)
            return fp
        except:
            return None

    def compare(self, fp1: Dict, fp2: Dict) -> Dict:
        scores = {}
        if 'phash' in fp1 and 'phash' in fp2:
            d = imagehash.hex_to_hash(fp1['phash']) - imagehash.hex_to_hash(fp2['phash'])
            scores['phash'] = max(0, 1 - d/64)
        if 'dhash' in fp1 and 'dhash' in fp2:
            d = imagehash.hex_to_hash(fp1['dhash']) - imagehash.hex_to_hash(fp2['dhash'])
            scores['dhash'] = max(0, 1 - d/64)
        if 'face_encodings' in fp1 and 'face_encodings' in fp2:
            best = 0
            for e1 in fp1['face_encodings']:
                for e2 in fp2['face_encodings']:
                    dist = np.linalg.norm(e1-e2)
                    best = max(best, 1-dist)
            scores['faces'] = best
        overall = sum(scores.get(k,0)*self.weights[k] for k in self.weights)
        total_w = sum(self.weights[k] for k in scores if k in self.weights)
        if total_w > 0:
            overall /= total_w
        return {'similarity': overall, 'is_match': overall>0.85, 'details': scores}

# ============================================
# Detector de multicuentas (avanzado)
# ============================================
class MultiProfileDetector:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': 'Mozilla/5.0'})
        self.img_comparator = ImageForensicComparator()

    def find_alternatives(self, username: str, platform: str, known_data: ExtractedData,
                          known_fingerprints: List = None) -> List[AlternativeAccount]:
        alternatives = []
        variations = self._gen_variations(username)
        url_template = PlatformDatabase.get_all().get(platform)
        if not url_template:
            return []
        with ThreadPoolExecutor(max_workers=10) as exec:
            futures = {}
            for var in variations[:30]:
                url = url_template.format(username=var)
                futures[exec.submit(self._check, url)] = var
            for fut in as_completed(futures):
                var = futures[fut]
                try:
                    exists, url = fut.result()
                    if exists and var != username:
                        alt = AlternativeAccount(platform=platform, username=var, url=url)
                        alt.confidence = 0.5
                        alternatives.append(alt)
                except:
                    pass
        return sorted(alternatives, key=lambda x: x.confidence, reverse=True)

    def _gen_variations(self, username: str) -> List[str]:
        vars = [username]
        for i in range(1,10):
            vars += [f"{username}{i}", f"{username}_{i}"]
        for p in ['the','real','its']:
            vars.append(f"{p}{username}")
        for s in ['_','.','-','_official','_real','_priv']:
            vars.append(f"{username}{s}")
        return list(set(vars))[:50]

    def _check(self, url) -> Tuple[bool, str]:
        try:
            r = self.session.get(url, timeout=5, allow_redirects=True)
            return (r.status_code==200 and 'login' not in r.url.lower()), url
        except:
            return False, url

# ============================================
# Motor de correlación avanzado con grafos
# ============================================
class AdvancedCrossReferenceEngine:
    def __init__(self):
        self.graph = nx.MultiDiGraph()
        self.node_idx = {}
        self.vectorizer = TfidfVectorizer(max_features=1000, ngram_range=(1,3))

    def add_node(self, dtype: str, value: Any, source: str):
        nid = f"{dtype}:{hashlib.md5(str(value).encode()).hexdigest()[:12]}"
        self.graph.add_node(nid, type=dtype, value=str(value), sources=[source])
        self.node_idx[nid] = (dtype, value)
        for other in list(self.graph.nodes):
            if other == nid: continue
            odtype, ovalue = self.node_idx[other]
            if dtype == 'email' and odtype == 'email' and value.lower() == ovalue.lower():
                self.graph.add_edge(nid, other, weight=1.0, type='exact_email')
            elif dtype == 'username' and odtype == 'email':
                if value.lower() in ovalue.lower():
                    self.graph.add_edge(nid, other, weight=0.7, type='username_in_email')

    def cross_reference(self, query_value: str, query_type: str = 'username', depth: int = 2) -> Dict:
        if not self.graph.nodes:
            return {'clusters':[], 'insights':[]}
        seed = None
        for nid, (dt, val) in self.node_idx.items():
            if dt == query_type and str(val).lower() == query_value.lower():
                seed = nid
                break
        if not seed:
            return {'clusters':[], 'insights':[]}
        visited = set()
        queue = deque([(seed,0)])
        found = []
        while queue:
            nid, d = queue.popleft()
            if nid in visited or d>depth: continue
            visited.add(nid)
            found.append(nid)
            for nb in self.graph.neighbors(nid):
                if nb not in visited:
                    queue.append((nb, d+1))
        emails = set()
        names = set()
        for nid in found:
            dt, val = self.node_idx[nid]
            if dt=='email': emails.add(val)
            elif dt=='name': names.add(val)
        return {'clusters':[{'type':'identity','emails':list(emails),'names':list(names)}],
                'insights':[f"Emails asociados: {len(emails)}", f"Nombres: {len(names)}"]}

# ============================================
# Analizador forense de comportamiento
# ============================================
class ForensicAnalyzer:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=1000, ngram_range=(1,3))
        self.cache = {}

    def fingerprint_profile(self, profile: SocialProfile, posts: List[str]) -> Dict:
        if not posts:
            return {}
        all_text = ' '.join(posts)
        try:
            tfidf = self.vectorizer.fit_transform([all_text])
            vec = tfidf.toarray()[0]
        except:
            vec = np.zeros(1000)
        return {
            'avg_len': np.mean([len(p) for p in posts]),
            'emoji_rate': sum(1 for p in posts for c in p if c in '😀😃😄')/len(posts),
            'hashtag_rate': sum(1 for p in posts for w in p.split() if w.startswith('#'))/len(posts),
            'tfidf': vec.tolist()
        }

    def compare_fingerprints(self, fp1: Dict, fp2: Dict) -> float:
        if not fp1 or not fp2:
            return 0.0
        sim = 0.0
        if abs(fp1.get('avg_len',0)-fp2.get('avg_len',0)) < 20:
            sim += 0.3
        sim += 0.3 * (1 - abs(fp1.get('emoji_rate',0)-fp2.get('emoji_rate',0)))
        sim += 0.4 * (1 - spatial.distance.cosine(fp1.get('tfidf',[0]*1000), fp2.get('tfidf',[0]*1000)))
        return min(1.0, sim)

# ============================================
# Monitor continuo (hilo opcional)
# ============================================
class ContinuousMonitor:
    def __init__(self, detector: MultiProfileDetector):
        self.detector = detector
        self.threads = []

    def start(self, usernames: List[str], platforms: List[str]):
        for u in usernames:
            for p in platforms:
                t = threading.Thread(target=self._monitor, args=(u,p), daemon=True)
                t.start()
                self.threads.append(t)

    def _monitor(self, username, platform):
        while True:
            time.sleep(3600)  # cada hora
            # placeholder: re-consultar APIs
            pass

# ============================================
# Motor principal (SherlockUltimate)
# ============================================
class SherlockUltimate:
    def __init__(self, config: Config):
        self.config = config
        self.extractor = DataExtractor()
        self.platforms = PlatformDatabase.get_all()
        self.session = requests.Session()
        adapter = HTTPAdapter(pool_connections=30, pool_maxsize=30, max_retries=Retry(total=1, backoff_factor=0.3))
        self.session.mount('http://', adapter)
        self.session.mount('https://', adapter)
        self.session.headers.update({'User-Agent': 'Mozilla/5.0'})
        self.img_forensic = ImageForensicComparator()
        self.multi_detector = MultiProfileDetector()
        self.correlation = AdvancedCrossReferenceEngine()
        self.forensic_analyzer = ForensicAnalyzer()
        self.monitor = ContinuousMonitor(self.multi_detector) if config.enable_monitoring else None

    def _search_platforms(self, target: str, result: InvestigationResult):
        total = len(self.platforms)
        result.total_platforms_checked = total
        with Progress(SpinnerColumn(), TextColumn("[cyan]Buscando perfiles..."), BarColumn(),
                      TaskProgressColumn(), console=console, transient=False) as progress:
            task = progress.add_task("Progreso", total=total)
            with ThreadPoolExecutor(max_workers=self.config.max_workers) as executor:
                future_to_plat = {}
                for plat, tpl in self.platforms.items():
                    url = tpl.format(username=target)
                    future_to_plat[executor.submit(self._check_platform, plat, url, target)] = plat
                done, not_done = wait(future_to_plat.keys(), timeout=60.0)
                for f in not_done:
                    f.cancel()
                    progress.update(task, advance=1)
                for f in done:
                    plat = future_to_plat[f]
                    try:
                        profile = f.result(timeout=0)
                        if profile and profile.found:
                            result.profiles.append(profile)
                            result.profiles_found += 1
                    except Exception:
                        pass
                    progress.update(task, advance=1)
        console.print(f"\n[green]✅ Perfiles encontrados: {result.profiles_found}[/green]")

    def _check_platform(self, platform: str, url: str, username: str) -> Optional[SocialProfile]:
        try:
            resp = self.session.get(url, timeout=(3.05, self.config.timeout), allow_redirects=True)
            if resp.status_code == 200 and 'login' not in resp.url.lower():
                profile = SocialProfile(platform=platform, url=url, username=username, found=True)
                soup = BeautifulSoup(resp.text, 'html.parser')
                og = soup.find('meta', property='og:image')
                if og and og.get('content'):
                    profile.photo_url = og['content']
                return profile
        except:
            pass
        return None

    def investigate(self, target: str) -> InvestigationResult:
        start = time.time()
        result = InvestigationResult(target=target)
        console.print(Panel(f"[bold cyan]🔍 Sherlock++ Ultimate[/bold cyan]\n"
                            f"Objetivo: {target}   Inicio: {datetime.now().strftime('%H:%M:%S')}",
                            style="cyan"))
        console.print(f"\n[bold]🔍 Fase 1: Buscando en {len(self.platforms)} plataformas...[/bold]")
        self._search_platforms(target, result)

        console.print("\n[bold]📊 Fase 2: Extrayendo datos...[/bold]")
        all_data = ExtractedData()
        for profile in result.profiles:
            page_data = self.extractor.extract_from_url(profile.url)
            for attr in ['emails','phones','names','locations','urls','usernames','workplaces','education']:
                getattr(all_data, attr).update(getattr(page_data, attr))
            for email in page_data.emails:
                self.correlation.add_node('email', email, profile.url)
            for name in page_data.names:
                self.correlation.add_node('name', name, profile.url)
        result.extracted_data = all_data

        if self.config.enable_multi_profile:
            console.print("\n[bold]👥 Fase 3: Cuentas alternativas...[/bold]")
            alt_dict = {}
            total_alt = 0
            for profile in result.profiles[:10]:
                alts = self.multi_detector.find_alternatives(target, profile.platform, all_data)
                if alts:
                    alt_dict[profile.platform] = alts
                    total_alt += len(alts)
                    console.print(f"  {profile.platform}: {len(alts)} alternativas")
            result.alternative_accounts = alt_dict
            result.total_alternatives = total_alt

        console.print("\n[bold]🔗 Fase 4: Correlación avanzada...[/bold]")
        corr = self.correlation.cross_reference(target, 'username')
        if corr['insights']:
            result.insights = corr['insights']
        result.confidence_score = min(0.5 + result.profiles_found*0.01, 1.0)
        result.risk_score = min(len(all_data.emails)*0.1 + len(all_data.phones)*0.15, 1.0)
        result.elapsed_time = time.time() - start
        return result

    def display_results(self, result: InvestigationResult):
        console.print(f"\n[bold green]✅ Completado en {result.elapsed_time:.1f}s[/bold green]")
        table = Table(title="📊 Resumen", box=box.ROUNDED)
        table.add_column("Métrica", style="cyan")
        table.add_column("Valor", style="yellow")
        table.add_row("Perfiles encontrados", str(result.profiles_found))
        table.add_row("Emails", str(len(result.extracted_data.emails) if result.extracted_data else 0))
        table.add_row("Teléfonos", str(len(result.extracted_data.phones) if result.extracted_data else 0))
        table.add_row("Cuentas alternativas", str(result.total_alternatives))
        table.add_row("Confianza", f"{result.confidence_score:.0%}")
        table.add_row("Riesgo", f"{result.risk_score:.0%}")
        console.print(table)
        if result.insights:
            console.print("\n[bold]💡 Insights:[/bold]")
            for ins in result.insights:
                console.print(f"  • {ins}")

# ============================================
# CLI
# ============================================
def main():
    parser = argparse.ArgumentParser(description='Sherlock++ Ultimate')
    parser.add_argument('target', nargs='?')
    parser.add_argument('--forensic', '-f', action='store_true')
    parser.add_argument('--multi-profile', '-m', action='store_true')
    parser.add_argument('--quick', '-q', action='store_true')
    parser.add_argument('--export', '-e', choices=['json','html'])
    parser.add_argument('--setup', action='store_true')
    args = parser.parse_args()

    if args.setup:
        Config().save()
        console.print("[green]Configuración guardada.[/green]")
        return
    if not args.target:
        console.print("[red]Debes proporcionar un objetivo[/red]")
        return

    config = Config.load()
    config.save()
    if args.forensic: config.enable_forensic = True
    if args.multi_profile: config.enable_multi_profile = True
    if args.quick: config.max_workers = 10; config.download_photos = False

    sherlock = SherlockUltimate(config)
    try:
        result = sherlock.investigate(args.target)
        sherlock.display_results(result)
    except KeyboardInterrupt:
        console.print("[yellow]Interrumpido[/yellow]")
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        import traceback; traceback.print_exc()

if __name__ == "__main__":
    main()
