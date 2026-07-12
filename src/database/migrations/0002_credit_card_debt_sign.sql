UPDATE `accounts`
SET `opening_balance` = -`opening_balance`
WHERE `type` = 'credit_card' AND `opening_balance` > 0;
