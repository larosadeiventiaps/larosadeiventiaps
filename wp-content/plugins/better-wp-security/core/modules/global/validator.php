<?php

use iThemesSecurity\Config_Validator;
use \iThemesSecurity\User_Groups;

class ITSEC_Global_Validator extends Config_Validator {

	/**
	 * @phpstan-type GlobalSettings array{
	 *     lockout_white_list?: string[],
	 *     manage_group?: string[],
	 *     lockout_period?: int,
	 *     blacklist_period?: int,
	 *     blacklist?: bool,
	 *     blacklist_count?: int,
	 *     automatic_temp_auth?: bool,
	 *     proxy?: string,
	 *     proxy_header?: string,
	 * }
	 */
	protected function validate_settings() {
		if ( ITSEC_Core::is_interactive() && $this->settings['manage_group'] && $this->settings['manage_group'] !== $this->previous_settings['manage_group'] ) {
			$matcher = ITSEC_Modules::get_container()->get( User_Groups\Matcher::class );

			if ( ! $matcher->matches( User_Groups\Match_Target::for_user( wp_get_current_user() ), $this->settings['manage_group'] ) ) {
				$this->add_error( new WP_Error( 'itsec-validator-global-cannot-exclude-self', __( 'The configuration you have chosen removes your capability to manage Solid Security.', 'better-wp-security' ), [ 'status' => 400 ] ) );
				$this->set_can_save( false );
			}
		}

		/**
		 * Allows modules to validate global settings changes.
		 *
		 * @param WP_Error|null $error Return a WP_Error to block saving.
		 * @param GlobalSettings $settings The new global settings being saved.
		 * @param GlobalSettings $previous_settings The current saved global settings.
		 */
		$error = apply_filters( 'itsec_validate_global_settings', null, $this->settings, $this->previous_settings );

		if ( is_wp_error( $error ) ) {
			$this->add_error( $error );
			$this->set_can_save( false );
		}

		parent::validate_settings();
	}
}

ITSEC_Modules::register_validator( new ITSEC_Global_Validator( ITSEC_Modules::get_config( 'global' ) ) );
