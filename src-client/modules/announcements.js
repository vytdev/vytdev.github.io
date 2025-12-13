/**
 * Change the announcement.
 * @param infoHtml The announcement text in HTML.
 */
export function changeAnnouncement(infoHtml) {
  const block = document.querySelector('.announcement-block');
  block.innerHTML = infoHtml;
  block.style.display = 'block';
}


/**
 * Hie the announcement.
 */
export function hideAnnouncement() {
  document.querySelector('.announcement-block').style.display = 'none';
}
