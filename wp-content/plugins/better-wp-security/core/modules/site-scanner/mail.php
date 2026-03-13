<?php

use iThemesSecurity\Site_Scanner\Entry;
use iThemesSecurity\Site_Scanner\Priority;
use iThemesSecurity\Site_Scanner\Scan;
use iThemesSecurity\Site_Scanner\Status;
use iThemesSecurity\Site_Scanner\Issue;
use iThemesSecurity\Site_Scanner\Vulnerability_Issue;

class ITSEC_Site_Scanner_Mail {

	/**
	 * Sends a notification about the results of the scan.
	 *
	 * @param Scan $scan
	 *
	 * @return bool
	 */
	public static function send( Scan $scan ) {
		$nc = ITSEC_Core::get_notification_center();

		if ( ! $nc->is_notification_enabled( 'malware-scheduling' ) ) {
			return true;
		}

		if ( $scan->get_status() !== Status::WARN ) {
			// Don't send it if it's clean, has only muted issues or errors
			return true;
		}

		$nc   = ITSEC_Core::get_notification_center();
		$mail = static::get_mail( $scan );

		return $nc->send( 'malware-scheduling', $mail );
	}

	/**
	 * Gets the configured Mail template for a Scan.
	 *
	 * @param Scan $scan
	 *
	 * @return ITSEC_Mail
	 */
	public static function get_mail( Scan $scan ) {
		$nc = ITSEC_Core::get_notification_center();

		$mail = $nc->mail();
		$code = $scan->get_code();
		$mail->set_subject( static::get_scan_subject( $code ) );
		$mail->set_recipients( $nc->get_recipients( 'malware-scheduling' ) );

		$issues = $scan->count( Status::WARN );
		$errors = count( $scan->get_errors() );
		$lead = '';

		if ( $issues ) {
			$lead = sprintf( esc_html(
				_n(
					'The site scan found %1$s issue when scanning %2$s.',
					'The site scan found %1$s issues when scanning %2$s.',
					$issues,
					'better-wp-security'
				)
			), number_format_i18n( $issues ), $scan->get_url() );
		}

		if ( $errors ) {
			if ( $lead ) {
				$lead .= ' ' . sprintf( esc_html(
						_n(
							'The scanner encountered %s additional error.',
							'The scanner encountered %s additional errors.',
							$errors,
							'better-wp-security'
						)
					), number_format_i18n( $errors ) );
			} else {
				$lead = sprintf( esc_html(
					_n(
						'The site scan encountered %1$s error when scanning %2$s.',
						'The site scan encountered %1$s errors when scanning %2$s.',
						$errors,
						'better-wp-security'
					)
				), number_format_i18n( $errors ), $scan->get_url() );
			}
		}

		$mail->add_header(
			self::get_scan_heading( $code ),
			sprintf(
				esc_html__( 'Site Scan for %s', 'better-wp-security' ),
				'<b>' . ITSEC_Lib::date_format_i18n_and_local_timezone( $scan->get_time()->getTimestamp(), get_option( 'date_format' ) ) . '</b>'
			),
			false,
			$lead,
		);
		$priority = $scan->get_priority();
		self::add_overall_priority_section( $mail, $priority );
		static::format_scan_body( $mail, $scan );
		$mail->add_footer( false );

		return $mail;
	}

	/**
	 * Get the subject line for a site scan result.
	 *
	 * @param string $code
	 *
	 * @return string
	 */
	public static function get_scan_subject( $code ) {

		switch ( $code ) {
			case 'scan-failure-server-error':
			case 'scan-failure-client-error':
			case 'error':
				return esc_html__( 'Site scan resulted in an error', 'better-wp-security' );
			case 'clean':
				return esc_html__( 'Site scan found no issues.', 'better-wp-security' );
			default:
				require_once( dirname( __FILE__ ) . '/util.php' );

				if ( $codes = ITSEC_Site_Scanner_Util::translate_findings_code( $code ) ) {
					return wp_sprintf( esc_html__( 'Site scan report: %l', 'better-wp-security' ), $codes );
				}

				return esc_html__( 'Site scan found warnings', 'better-wp-security' );
		}
	}

	/**
	 * Get the heading for a site scan result.
	 *
	 * @param string $code
	 *
	 * @return string
	 */
	private static function get_scan_heading( string $code ): string {
		switch ( $code ) {
			case 'vulnerable-software':
				return esc_html__( 'New Vulnerabilities Identified!', 'better-wp-security' );
			case 'on-blacklist':
				return esc_html__( 'Site Blocklisted!', 'better-wp-security' );
			case 'found-malware':
				return esc_html__( 'Malware Found!', 'better-wp-security' );
			default:
				return esc_html__( 'Site Scan', 'better-wp-security' );
		}
	}

	/**
	 * Format the scan results into the mail object.
	 *
	 * @param ITSEC_Mail $mail
	 * @param Scan       $scan
	 */
	public static function format_scan_body( ITSEC_Mail $mail, $scan ) {
		$log_url = '';

		if ( $scan->get_id() ) {
			$log_url = ITSEC_Core::get_logs_page_url( [ 'id' => $scan->get_id() ] );
			$log_url = ITSEC_Mail::filter_admin_page_url( $log_url );
		}

		$mail->start_group( 'report' );

		foreach ( $scan->get_entries() as $entry ) {
			if ( $entry->get_status() !== Status::WARN || count( $entry->get_issues() ) === 0 ) {
				continue;
			}

			switch ( $entry->get_slug() ) {
				case 'vulnerabilities':
					$mail->add_section_heading( __('New Vulnerabilities', 'better-wp-security') );
					$mail->add_text(
						__('Each vulnerability is assigned a Patchstack priority score to help inform your next steps. If no virtual patch has been applied, ensure that you patch/update within the recommended timeframe.', 'better-wp-security'),
						'light',
						10
					);
					$mail->add_section(self::format_vulnerability_issues( $mail, $entry->get_issues() ));
					break;
				default:
					$mail->add_list(self::format_issues($entry), false, true, $entry->get_title());
			}
		}

		$errors = count( $scan->get_errors() );

		if ( $errors ) {
			$mail->add_section_heading( esc_html__( 'Scan Errors', 'better-wp-security' ) );
			$mail->add_list( array_map( 'esc_html', wp_list_pluck( $scan->get_errors(), 'message' ) ) );
		}

		$mail->end_group();

		if ( $log_url ) {
			$mail->add_button( esc_html__( 'View Report', 'better-wp-security' ), $log_url );
		}

		$mail->add_divider();
		$vulnerabilities = $scan->find_entry( 'vulnerabilities' );

		if ( $vulnerabilities && $vulnerabilities->count() ) {
			$mail->add_large_text( esc_html__( 'What Actions Should I Take?', 'better-wp-security' ) );
			$mail->add_text(
				esc_html__( 'Vulnerable WordPress plugins and themes are the #1 reason WordPress sites get hacked.', 'better-wp-security' ) .
				' <b>' . esc_html__( 'Either quickly update the vulnerable theme, plugin or WordPress version immediately to the newest version or immediately deactivate and delete the plugin or theme from your WordPress installation until a fix is available.', 'better-wp-security' ) . '</b>',
				'dark'
			);

			if ( $log_url ) {
				$mail->add_section_heading( esc_html__( 'How to View the Report & See Available Updates', 'better-wp-security' ) );
				$mail->add_123_box(
					sprintf(
						esc_html__( '%1$sView the Site Scan Report%2$s available now from your WordPress admin dashboard.', 'better-wp-security' ),
						'<a href="' . esc_url( $log_url ) . '">',
						'</a>'
					),
					esc_html__( 'In the Known Vulnerabilities section of the report, click “Show Details.” If a security fix is available, the report will indicate the latest version number.', 'better-wp-security' ),
					esc_html__( 'If a security fix is available, update the vulnerable plugin or theme as soon as possible from Your WordPress admin dashboard > Updates page.', 'better-wp-security' ) .
					' <a href="' . esc_url( ITSEC_Mail::filter_admin_page_url( admin_url( 'update-core.php' ) ) ) . '">' . esc_html__( 'Log in now to update.', 'better-wp-security' ) . '</a>'
				);
			}
		}

		if ( ! ITSEC_Core::is_pro() ) {
			$mail->add_site_scanner_pro_callout();
		}
	}

	private static function format_issues( Entry $entry): array {
		return array_reduce( $entry->get_issues(), static function ( array $list, Issue $issue ) {
			if ( $issue->get_status() !== Status::WARN ) {
				return $list;
			}

			$list[] = sprintf( '<a href="%s">%s</a>', esc_url( $issue->get_link() ), esc_html( $issue->get_description() ) );

			return $list;
		}, [] );
	}

	/**
	 * Prepare a formatted list of vulnerability issues.
	 *
	 * @param ITSEC_Mail $mail Target mail object.
	 * @param array<Issue> $issues Array of vulnerability issues.
	 *
	 * @return string Formatted HTML.
	 */
	public static function format_vulnerability_issues( ITSEC_Mail $mail, array $issues ): string {
		// Sort issues by priority (High -> Medium -> Low -> None) before rendering.
		usort($issues, static function ( Issue $a, Issue $b ): int {
			return $b->get_priority() <=> $a->get_priority();
		});

		return array_reduce( $issues, static function ( string $list, Issue $issue ) use ( $mail ) {
			if (  ! $issue instanceof Vulnerability_Issue || $issue->get_status() !== Status::WARN ) {
				return $list;
			}

			$item = '<p style="font-size: 16px; line-height: 24px; margin: 0;">' . esc_html( $issue->get_description() ) . '</p>';
			$item .= '<table style="padding-top: 16px; padding-bottom: 16px;"><tr><td>'
			         . '<strong style="font-size: 13px; margin-right: 8px">'
			         . __('Patchstack Priority:', 'better-wp-security')
			         . '</strong></td><td>'
			         . $mail->get_priority_badge( $issue->get_priority(), self::get_priority_label(  $issue->get_priority()))
			         . '</td></tr></table>';

			$item .= '<span style="font-size: 16px;">';
			$item .= sprintf( '<a href="%s">%s</a>', esc_url( ITSEC_Mail::filter_admin_page_url( $issue->get_link() ) ), esc_attr__( 'Manage Vulnerability', 'better-wp-security' ) );

			$patchstack = $issue->get_meta()['issue']['references'][0]['refs'][0]['link'] ?? '';

			if ( $patchstack ) {
				$item .= sprintf( ' | <a href="%s">%s</a>', esc_url( $patchstack ), esc_attr__( 'View in Patchstack', 'better-wp-security' ) );
			}
			$item .= '</span>';

			$list .= '<tr><td style="padding-top:28px; padding-bottom: 28px; border-bottom: 1px solid #e7e7e7;">' . $item . '</td></tr>';

			return $list;
		}, '<table style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">' ) . '</table>';
	}

	private static function add_overall_priority_section( ITSEC_Mail $mail, int $priority ): void {
		if ( $priority <= Priority::NONE ) {
			return;
		}
		$mail->add_section(
			$mail->get_priority_badge( $priority, self::get_priority_label( $priority))
			. '<p style="font-size: 13px; margin-top: 8px; margin-bottom: 0; color: #232323;">'
			. self::get_priority_description( $priority )
			. '</p>',
		);
	}

	/**
	 * Provide priority label.
	 *
	 * @psalm-param Priority::NONE | Priority::LOW | Priority::MEDIUM | Priority::HIGH $priority
	 * @param int $priority
	 *
	 * @return string
	 */
	private static function get_priority_label( int $priority ): string {
		switch ( $priority ) {
			case Priority::NONE:
				return esc_html__( 'None', 'better-wp-security' );
			case Priority::LOW:
				return esc_html__( 'Low', 'better-wp-security' );
			case Priority::MEDIUM:
				return esc_html__( 'Medium', 'better-wp-security' );
			default:
				return esc_html__( 'High', 'better-wp-security' );
		}
	}

	/**
	 * Provide priority description.
	 *
	 * @psalm-param Priority::NONE | Priority::LOW | Priority::MEDIUM | Priority::HIGH $priority
	 * @param int $priority
	 *
	 * @return string
	 */
	private static function get_priority_description( int $priority ): string {
		switch ( $priority ) {
			case Priority::NONE:
				return '';
			case Priority::LOW:
				return __( 'Low-priority issues found. Resolve within <strong>30 days.</strong>', 'better-wp-security' );
			case Priority::MEDIUM:
				return __( 'Medium-priority issues found. Resolve within <strong>7 days.</strong>', 'better-wp-security' );
			default:
				return __( 'High-priority issues found. Resolve within <strong>24 hours.</strong>', 'better-wp-security' );
		}
	}
}
