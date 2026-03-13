/**
 * External dependencies
 */
import styled from '@emotion/styled';

export const StyledPriorityDescription = styled.span`
	display: flex;
	flex-direction: column;
`;

export const StyledCompactContainer = styled.div`
	background-color: ${ ( { priority } ) => priority === 'low' && '#e7e7e7' };
	background-color: ${ ( { priority } ) => priority === 'medium' && '#ffcb2f' };
	background-color: ${ ( { priority } ) => priority === 'high' && '#d63638' };
	color: ${ ( { priority } ) => priority === 'low' && '#232323' };
	color: ${ ( { priority } ) => priority === 'medium' && '#232323' };
	color: ${ ( { priority } ) => priority === 'high' && '#ffffff' };
	display: flex;
	align-items: center;
	padding-right: 0.5rem;
	
	& > svg {
		width: 24px;
		height: 24px;
	}
`;

export const StyledExtendContainer = styled.div`
	background-color: ${ ( { priority } ) => priority === 'low' && '#e7e7e7' };
	background-color: ${ ( { priority } ) => priority === 'medium' && '#fffbef' };
	background-color: ${ ( { priority } ) => priority === 'high' && '#fcf0f1' };
	color: ${ ( { priority } ) => priority === 'low' && '#232323' };
	color: ${ ( { priority } ) => priority === 'medium' && '#FFCB2F' };
	color: ${ ( { priority } ) => priority === 'high' && '#D63638' };
	border: ${ ( { priority } ) => priority === 'medium' && '1px solid #ffc518' };
	border: ${ ( { priority } ) => priority === 'high' && '1px solid #d63638' };
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 1rem;
	width: 100%;
	gap: 1rem;
	
	& > svg {
		width: 48px;
		height: 48px;
	}
`;
