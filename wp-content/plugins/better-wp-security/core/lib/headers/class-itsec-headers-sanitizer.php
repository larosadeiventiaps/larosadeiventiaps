<?php

namespace iThemesSecurity\Headers;

use InvalidArgumentException;

class ITSEC_Headers_Sanitizer {

	private const APACHE_SPECIAL_CHARACTERS = "\"\\";
	private const NGINX_SPECIAL_CHARACTERS  = "\"\$\\";

	/**
	 * Sanitizes a value for use in an Apache "Header set" directive.
	 */
	public function sanitize_apache_value( string $value ): string {
		$value = $this->prevent_injection( $value );
		return addcslashes( $value, self::APACHE_SPECIAL_CHARACTERS );
	}

	/**
	 * Sanitizes a value for use in an Nginx "add_header" directive.
	 */
	public function sanitize_nginx_value( string $value ): string {
		$value = $this->prevent_injection( $value );
		return addcslashes( $value, self::NGINX_SPECIAL_CHARACTERS );
	}

	/**
	 * Prevents injection attacks by stripping newlines and null bytes from the value.
	 */
	private function prevent_injection( string $value ): string {
		return str_replace( [ "\r", "\n", "\0" ], '', $value );
	}

	/**
	 * Strict validation for Header Names.
	 * Allow Alpha-Numeric, Hyphens, and Underscores.
	 */
	public function validate_header_name( string $name ): bool {
		return preg_match( '/^[a-zA-Z0-9\-_]+$/', $name ) === 1;
	}

	/**
	 * Asserts if the given header name is valid.
	 *
	 * @param string $name The header name to validate.
	 * @throws InvalidArgumentException
	 *
	 */
	public function assert_valid_header_name(string $name): void {
		if ( ! $this->validate_header_name( $name ) ) {
			throw new InvalidArgumentException(
				sprintf('Invalid header name: %s. Only alphanumeric characters, hyphens and underscores are allowed.', $name )
			);
		}
	}

	/**
	 * Asserts if the given header value is valid.
	 *
	 * @param string $value
	 * @throws InvalidArgumentException
	 */
	public function assert_valid_header_value(string $value): void {
		if ( $this->prevent_injection( $value ) !== $value ) {
			throw new InvalidArgumentException(
				sprintf('Invalid header value: %s. Newlines and null bytes symbols are not allowed.', $value )
			);
		}
	}

	/**
	 * Normalize a header name.
	 *
	 * @param string $name
	 *
	 * @return string
	 */
	public function normalize_header_name( string $name ): string {
		if ( str_contains( $name, '_' ) ) {
			// Non-standard header name, leave it as-is.
			return $name;
		}

		return implode( '-', array_map( 'ucfirst', explode( '-', strtolower( $name ) ) ) );
	}
}
