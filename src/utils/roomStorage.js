const RECENT_ROOMS_KEY = 'recentRooms';
const CURRENT_ROOM_KEY = 'currentRoom';
const CURRENT_PLAYER_NAME_KEY = 'currentPlayerName';

function getRecentRooms() {
  return uni.getStorageSync(RECENT_ROOMS_KEY) || [];
}

function setRecentRooms(rooms) {
  uni.setStorageSync(RECENT_ROOMS_KEY, rooms);
  return rooms;
}

function saveRecentRoom(room) {
  const recentRooms = getRecentRooms()
    .filter((item) => item.inviteCode !== room.inviteCode);

  recentRooms.unshift(room);
  return setRecentRooms(recentRooms.slice(0, 5));
}

function removeRecentRoom(inviteCode) {
  const recentRooms = getRecentRooms()
    .filter((item) => item.inviteCode !== inviteCode);

  return setRecentRooms(recentRooms);
}

function updateStoredRoom(room) {
  uni.setStorageSync(CURRENT_ROOM_KEY, room);
  const recentRooms = getRecentRooms().map((item) => (
    item.inviteCode === room.inviteCode ? room : item
  ));
  setRecentRooms(recentRooms);
}

function clearCurrentRoom() {
  uni.removeStorageSync(CURRENT_ROOM_KEY);
  uni.removeStorageSync(CURRENT_PLAYER_NAME_KEY);
}

export {
  RECENT_ROOMS_KEY,
  CURRENT_ROOM_KEY,
  CURRENT_PLAYER_NAME_KEY,
  getRecentRooms,
  saveRecentRoom,
  removeRecentRoom,
  updateStoredRoom,
  clearCurrentRoom,
};
