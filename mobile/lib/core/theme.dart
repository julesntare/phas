import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _kKey = 'theme_mode';

final themeProvider =
    NotifierProvider<ThemeNotifier, ThemeMode>(ThemeNotifier.new);

class ThemeNotifier extends Notifier<ThemeMode> {
  @override
  ThemeMode build() {
    _load();
    return ThemeMode.system;
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kKey);
    if (raw == 'dark') { state = ThemeMode.dark; }
    else if (raw == 'light') { state = ThemeMode.light; }
  }

  void toggle() =>
      setMode(state == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark);

  void setMode(ThemeMode mode) {
    state = mode;
    SharedPreferences.getInstance().then((p) {
      p.setString(_kKey, switch (mode) {
        ThemeMode.dark   => 'dark',
        ThemeMode.light  => 'light',
        ThemeMode.system => 'system',
      });
    });
  }
}
