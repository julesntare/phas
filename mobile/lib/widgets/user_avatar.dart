import 'package:flutter/material.dart';
import '../models/user.dart';

/// Circular-ish avatar: the user's picture when there is one, their initial
/// otherwise. Used in the app bar, the account sheet and the profile header.
class UserAvatar extends StatelessWidget {
  final User? user;
  final double size;

  const UserAvatar({super.key, required this.user, this.size = 40});

  @override
  Widget build(BuildContext context) {
    final radius = size * 0.31;
    final url = user?.avatarUrl;
    final initial = (user?.displayName ?? 'C').characters.first;

    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: url != null
          ? Image.network(
              url,
              width: size,
              height: size,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) =>
                  _InitialAvatar(initial: initial, size: size),
            )
          : _InitialAvatar(initial: initial, size: size),
    );
  }
}

class _InitialAvatar extends StatelessWidget {
  final String initial;
  final double size;
  const _InitialAvatar({required this.initial, required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: const Color(0xFF0055A4).withAlpha(15),
        borderRadius: BorderRadius.circular(size * 0.31),
        border: Border.all(color: const Color(0xFF0055A4).withAlpha(40)),
      ),
      child: Center(
        child: Text(
          initial.toUpperCase(),
          style: TextStyle(
            fontSize: size * 0.41,
            fontWeight: FontWeight.w700,
            color: const Color(0xFF0055A4),
          ),
        ),
      ),
    );
  }
}
