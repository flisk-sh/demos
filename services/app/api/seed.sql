insert into board_items (id, title, done) values (1, 'Set up the stack', true) on conflict do nothing;
insert into board_items (id, title, done) values (2, 'Add your first item', false) on conflict do nothing;
insert into board_items (id, title, done) values (3, 'Reset to seed when you are done', false) on conflict do nothing;
