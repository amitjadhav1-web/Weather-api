/* script.js — Weather App (OpenWeatherMap)
   Replace YOUR_API_KEY with your OpenWeatherMap API key.
   Features:
   - Search by city
   - Use browser geolocation
   - Unit toggle (Celsius / Fahrenheit)
   - Favorites saved in localStorage
   - Graceful error handling and loading states
*/

const API_KEY = 'YOUR_API_KEY'; // <-- REPLACE this with your API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

const dom = {
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  geoBtn: document.getElementById('geoBtn'),
  card: document.getElementById('card'),
  cityName: document.getElementById('cityName'),
  desc: document.getElementById('desc'),
  icon: document.getElementById('icon'),
  temp: document.getElementById('temp'),
  feels: document.getElementById('feels'),
  humidity: document.getElementById('humidity'),
  wind: document.getElementById('wind'),
  clouds: document.getElementById('clouds'),
  pressure: document.getElementById('pressure'),
  error: document.getElementById('error'),
  loading: document.getElementById('loading'),
  unitInputs: document.getElementsByName('unit'),
  favInput: document.getElementById('favInput'),
  addFavBtn: document.getElementById('addFavBtn'),
  favList: document.getElementById('favList')
};

let unit = localStorage.getItem('weather_unit') || 'metric';
setUnitInputs();
let favorites = JSON.parse(localStorage.getItem('weather_favs') || '[]');

function setUnitInputs(){
  for(const el of dom.unitInputs) {
    if(el.value === unit) el.checked = true;
    el.addEventListener('change', (e)=>{
      unit = e.target.value;
      localStorage.setItem('weather_unit', unit);
      // refresh displayed city if any
      const currentCity = dom.cityName.dataset.query;
      if(currentCity) fetchByCity(currentCity);
    });
  }
}

function showLoading(on=true){
  dom.loading.hidden = !on;
}
function showError(msg){
  dom.error.hidden = false;
  dom.error.textContent = msg;
}
function clearError(){
  dom.error.hidden = true;
  dom.error.textContent = '';
}

function weatherUrl(params){
  const u = new URL(BASE_URL);
  Object.keys(params).forEach(k=>u.searchParams.append(k, params[k]));
  u.searchParams.append('appid', API_KEY);
  u.searchParams.append('units', unit);
  return u.toString();
}

async function fetchWeather(params){
  showLoading(true);
  clearError();
  try{
    const res = await fetch(weatherUrl(params));
    if(!res.ok){
      const err = await res.json().catch(()=>({message:res.statusText}));
      throw new Error(err.message || 'Unable to fetch weather');
    }
    const data = await res.json();
    showLoading(false);
    return data;
  }catch(err){
    showLoading(false);
    throw err;
  }
}

function render(data){
  dom.card.classList.remove('hidden');
  dom.cityName.textContent = `${data.name}, ${data.sys.country}`;
  dom.cityName.dataset.query = data.name;
  dom.desc.textContent = data.weather?.[0]?.description || '';
  const iconCode = data.weather?.[0]?.icon;
  if(iconCode){
    dom.icon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    dom.icon.alt = data.weather?.[0]?.description || 'weather icon';
  } else {
    dom.icon.src = '';
    dom.icon.alt = '';
  }

  const tempUnit = unit === 'metric' ? '°C' : '°F';
  dom.temp.textContent = `${Math.round(data.main.temp)}${tempUnit}`;
  dom.feels.textContent = `Feels like ${Math.round(data.main.feels_like)}${tempUnit}`;
  dom.humidity.textContent = `${data.main.humidity}%`;
  dom.wind.textContent = `${data.wind.speed} m/s`;
  dom.clouds.textContent = `${data.clouds.all}%`;
  dom.pressure.textContent = `${data.main.pressure} hPa`;
}

async function fetchByCity(city){
  if(!city) return;
  try{
    const data = await fetchWeather({q: city});
    render(data);
  }catch(err){
    showError('City not found or API error. Make sure your API key is valid and you have network access.');
    console.error(err);
  }
}

async function fetchByCoords(lat, lon){
  try{
    const data = await fetchWeather({lat, lon});
    render(data);
  }catch(err){
    showError('Unable to fetch weather for your location.');
    console.error(err);
  }
}

dom.searchBtn.addEventListener('click', ()=> {
  const q = dom.searchInput.value.trim();
  if(!q) return showError('Enter a city name to search.');
  fetchByCity(q);
});

dom.searchInput.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter') dom.searchBtn.click();
});

dom.geoBtn.addEventListener('click', ()=>{
  if(!navigator.geolocation){
    showError('Geolocation is not available in this browser.');
    return;
  }
  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude, longitude} = pos.coords;
    fetchByCoords(latitude, longitude);
  }, err=>{
    showError('Permission denied or unable to get location.');
  }, {timeout:10000});
});

// Favorites handling
function renderFavs(){
  dom.favList.innerHTML = '';
  favorites.forEach((c, i)=>{
    const div = document.createElement('div');
    div.className = 'fav-item';
    div.textContent = c;
    div.tabIndex = 0;
    div.addEventListener('click', ()=> fetchByCity(c));
    const del = document.createElement('button');
    del.textContent = '✕';
    del.title = 'Remove favorite';
    del.addEventListener('click', (e)=> {
      e.stopPropagation();
      favorites.splice(i,1);
      localStorage.setItem('weather_favs', JSON.stringify(favorites));
      renderFavs();
    });
    div.appendChild(del);
    dom.favList.appendChild(div);
  });
}

dom.addFavBtn.addEventListener('click', ()=>{
  const name = dom.favInput.value.trim();
  if(!name) return;
  if(!favorites.includes(name)){
    favorites.push(name);
    localStorage.setItem('weather_favs', JSON.stringify(favorites));
    renderFavs();
    dom.favInput.value = '';
  }
});

// initialize
renderFavs();

// on load, try to show last searched city
window.addEventListener('load', ()=>{
  const last = localStorage.getItem('weather_last');
  if(last) fetchByCity(last);
});

// save last city when a successful render happens
const originalRender = render;
render = function(data){
  originalRender(data);
  try{
    localStorage.setItem('weather_last', data.name);
  }catch(e){}
};
