<?php

namespace iThemesSecurity\Site_Scanner;

/**
 *  Enum describes how urgent the issue is.
 *  Low-priority issues should be fixed within 30 days,
 *  medium-priority during 7 days,
 *  and high-priority during 24 hours.
 *
 *  Non-prioritized issues don't require action.
 */
final class Priority {
	public const NONE = 0;
	public const LOW = 1;
	public const MEDIUM = 2;
	public const HIGH = 3;

	public static function key( int $priority ): string {
		switch ( $priority ) {
			case self::LOW:
				return 'low';
			case self::MEDIUM:
				return 'medium';
			case self::HIGH:
				return 'high';
			default:
				return 'none';
		}
	}
}
