insert into board_items (id, title, done) values (1, 'Mint #1', true) on conflict do nothing;
insert into board_items (id, title, done) values (2, 'Transfer #2', false) on conflict do nothing;
insert into board_items (id, title, done) values (3, 'Approve #3', false) on conflict do nothing;
