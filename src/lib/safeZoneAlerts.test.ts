import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { MailMessage } from './mailer';
import { notifySafeZoneExit, type SafeZoneExitNotice } from './safeZoneAlerts';

const NOTICE: SafeZoneExitNotice = {
  elderName: 'Suresh Kumar',
  fence: { latitude: 28.6139, longitude: 77.209, radius_m: 500, label: 'Ghar' },
  distanceM: 742,
  point: { latitude: 28.5355, longitude: 77.391 },
  caregiverEmail: 'vansh@example.com',
  emailPreference: true,
  at: new Date('2026-09-25T14:05:00.000Z'),
};

/** Records what a real transport would have been handed, so branches are provable. */
function recordingSender(result = true) {
  const sent: MailMessage[] = [];
  return {
    sent,
    send: async (message: MailMessage) => {
      sent.push(message);
      return result;
    },
  };
}

test('an unmuted elder gets the safe-zone email', async () => {
  const mailer = recordingSender();

  const outcome = await notifySafeZoneExit(NOTICE, mailer.send);

  assert.equal(outcome, 'sent');
  assert.equal(mailer.sent.length, 1, 'exactly one message is handed over');
  assert.equal(mailer.sent[0].to, 'vansh@example.com');
  assert.match(mailer.sent[0].subject, /Suresh Kumar left "Ghar"/);
  assert.match(mailer.sent[0].text, /about 742 m/);
  assert.match(mailer.sent[0].text, /https:\/\/www\.google\.com\/maps\?q=28\.535500,77\.391000/);
});

test('a muted elder gets no email, and nothing is given to the transport', async () => {
  const mailer = recordingSender();

  const outcome = await notifySafeZoneExit({ ...NOTICE, emailPreference: false }, mailer.send);

  assert.equal(outcome, 'muted');
  assert.deepEqual(mailer.sent, [], 'muted must not touch the mail transport at all');
});

test('an unread or missing preference keeps mailing', async () => {
  for (const emailPreference of [null, undefined]) {
    const mailer = recordingSender();
    const outcome = await notifySafeZoneExit({ ...NOTICE, emailPreference }, mailer.send);
    assert.equal(outcome, 'sent', 'a missing preference must fail towards notifying');
    assert.equal(mailer.sent.length, 1);
  }
});

test('an elder with no caregiver account address skips the email', async () => {
  const mailer = recordingSender();

  const outcome = await notifySafeZoneExit({ ...NOTICE, caregiverEmail: null }, mailer.send);

  assert.equal(outcome, 'no-recipient');
  assert.deepEqual(mailer.sent, []);
});

test('a failing transport is reported, never thrown', async () => {
  const mailer = recordingSender(false);

  const outcome = await notifySafeZoneExit(NOTICE, mailer.send);

  assert.equal(outcome, 'failed', 'a mail failure must not fail the heartbeat');
  assert.equal(mailer.sent.length, 1, 'the attempt is still visible');
});

test('muting is checked before the recipient, so nothing is composed for a muted elder', async () => {
  const mailer = recordingSender();

  const outcome = await notifySafeZoneExit(
    { ...NOTICE, emailPreference: false, caregiverEmail: null },
    mailer.send
  );

  assert.equal(outcome, 'muted', 'the mute is the caller-visible reason');
  assert.deepEqual(mailer.sent, []);
});
